/* global angular, _, jQuery, Backbone */

angular.module('dci')
	.config(function ($stateProvider, $urlRouterProvider) {
		console.log('... define experiment states');

		$stateProvider.state('experiment', {
		  	url: '/experiment?id',
		  	template:'<div class="experiment-main" ui-view></div>',
		  	resolve: {
				pitypes:($http) => $http.get('../mitm_out/pi_by_host.json').then((x) => x.data),
				hosts: ($http) => $http.get('../mitm_out/host_by_app.json').then((x) => x.data),
				details: ($http) => $http.get('../mitm_out/company_details.json').then((x) => x.data),
				data: ($http) => $http.get('../mitm_out/data_all.json').then((x) => x.data),
				fakeapps:($http) => $http.get('../mitm_out/fakeapps.txt').then((x) => x.data.split('\n').filter((x) => x))
			},
			controller:function($scope, $stateParams, $state, pitypes, hosts, data, details, storage, fakeapps, utils) {

				var apps = $scope.apps = _.uniq(data.map((x) => x.app)),
					range = $scope.range = utils.range;				

				console.log('experiment framework > ', apps.length, 'apps');				
				console.log('fakeapps', fakeapps);
				$scope.data = $scope.allData = data;
				$scope.fakeapps = fakeapps;
				$scope.pitypes = pitypes;
				$scope.hosts = hosts;
				$scope.details = details;

				$scope.thisname = 'experiment';
				$scope.load = function(eId) { 	
					// sets current experiment to be this experiment
					utils.assert(eId, "eID not defined" + eId);
					return storage.db.get(eId).then((doc) => { 
						$scope.experiment = doc; 
						return $scope.experiment; 
					});
				};
				$scope.setExperiment = function(e) { $scope.experiment = e; };
				$scope.save = function() { 	
					// saves $scope.experiment to disk --
					console.log('saving starts >>');
					if (!$scope.experiment) { throw new Error("experiment not defined"); }
					if (!$scope.experiment._id) { throw new Error("experiment id not defined"); }
					window.exp = $scope.experiment;
					var id = $scope.experiment._id;
					return storage.db.get(id).then((doc) => {
						doc = _.extend({}, doc, utils.deAngular($scope.experiment), {_rev:doc._rev});
						console.info("Document found, updating ", doc, doc._rev);
						window._db = storage.db;
						return storage.db.put(doc).then(() => doc);
					}).catch((e) => {
						// document not found
						console.error('error ', e);
						var doc = utils.deAngular($scope.experiment);
						if (doc.status === 404) { 
							console.info("Document not found ", doc);
						}
						return storage.db.put(doc);
					}).finally((x) => {
						console.info('finally done experiment ', id);
						return x;
					});
				};
				$scope.getTask = (taskid) => {
					if (taskid.indexOf('task-') === 0) {
						var idx = parseInt(taskid.slice('task-'.length));
						if ($scope.experiment.rounds[idx] !== undefined) {
							return $scope.experiment.rounds[idx];
						}
						throw new Error("Could not get task " + taskid);
					}
				};
				$scope.makeTaskId = (task) => {
					var idx = $scope.experiment.rounds.indexOf(task);
					if (idx >= 0) { 
						return ['task',''+idx].join('-');
					}
					throw new Error("Error making taskID");
				};
				$scope.findNextState = (cur_tid) => {
					if (cur_tid.indexOf('task-') === 0) {
						var idx = parseInt(cur_tid.slice('task-'.length)),
							nxt = idx+1;
						console.info('cur_tid is ', cur_tid, 'idx', idx, ' nxt', nxt);
						if ($scope.experiment.rounds[nxt]) {
							return {tid:$scope.makeTaskId($scope.experiment.rounds[nxt])};
						} 
						return; // fall through
					}	
					throw new Error("Malformed taskID " + cur_tid);						
					/*
					var tasksplit = cur_tid.split('::'),
						pdciopt = tasksplit[0],
						round = parseInt(tasksplit[1]),
						nextRound = round+1;

					if ($scope.experiment.rounds[pdciopt][nextRound]) { 
						return { tid: $scope.makeTaskId($scope.experiment.rounds[pdciopt][nextRound]), pdci:pdciopt==='pdci' };
					}
					//	we have run out of dci
					if (pdciopt === 'dci' && $scope.experiment.rounds.pdci[0]) { 
						return { tid: $scope.makeTaskId($scope.experiment.rounds.pdci[0]), pdci:true };
					}
					*/

					// fall through
				};

				// delegate to a substate ::
				//   if run then we go and run otherwise manage
				if ($stateParams.id) { 
					$state.go('experiment.run', {id:$stateParams.id});
				} else {
					$state.go('experiment.manage');
				}


			}			
		});

		// manage experimental data: view, delete, export
		$stateProvider.state('experiment.manage', {
		  	url: '/manage',
		  	templateUrl:'tmpl/manage.html',
			controller:function($scope, $state, storage, utils) {
				$scope.selected = 0;
				// load all things into a view
				var refresh_docs = () => {
					storage.db.allDocs({include_docs:true}).then((docs_arr) => {
						console.info('got all docs ', docs_arr.rows, docs_arr.rows.length);
						$scope.experiments = docs_arr.rows.map((x) => x.doc) || [];
					});
				};
				$scope.toDateStr = (ds) => new Date(parseInt(ds)).toDateString() + ' ' + new Date(parseInt(ds)).toLocaleTimeString();
				$scope.load = (e) => { 	$state.go('experiment.run', { id: e._id }); };
				$scope.delete = (e, $evt) => { 
					console.info('delete ', e);
					$evt.stopPropagation();
					storage.db.get(e._id).then((doc) => storage.db.remove(doc)).then(refresh_docs);
				};
				$scope.export = (e, $evt) => { 
					$evt.stopPropagation();
					$scope.exportData = JSON.stringify(e, null, 2);	
				};
				$scope.new = () => {
					$scope.setExperiment({});
					$state.go('experiment.config');
				};
				$scope.filterComplete = (rs) => rs.filter((r) => r.result && r.result.chosen);

				refresh_docs();
			}
		});

		// config a new one
		$stateProvider.state('experiment.config', {
		  	url: '/config',
		  	templateUrl:'tmpl/config.html',
		  	resolve: {
				words:($http) => $http.get('misc/nouns.json').then((x) => x.data)
			},
			controller:function($scope, $state, words, utils) {
				var hosts = $scope.hosts, data = $scope.data, pitypes = $scope.pitypes;
				words = words.nouns;
				console.log('config nouns', words.nouns);
				var apps = $scope.apps,
					range = $scope.range,
					ifaces = $scope.ifaces = ['permission', 'permpurpose', 'dci', 'pdci', 'tablepl'],
					genPID = $scope.genPID = () => {
						return utils.wordguid(2,words);
					},
					makeRID = () => {
						return ['run', $scope.participantid, (new Date()).toLocaleDateString(), (new Date()).toTimeString() ].join(':');
					};
				$scope.participantid = genPID();
				$scope.runid = makeRID();
				$scope.rounds = [];
				$scope.$watch('nRounds', () => {
					var pN = parseInt($scope.nRounds);
					if ($scope.rounds.length > pN) { 
						$scope.rounds = $scope.rounds.slice(0,pN);
					} else if ($scope.rounds.length < pN) { 
						range(pN - $scope.rounds.length).map(() => {
							$scope.rounds.push({a:apps[0],b:apps[0],cond:ifaces[0]});
						});
					}
				});
				$scope.$watch('participantid', () => { $scope.runid = makeRID(); });
				$scope.parseCode = (code) => {
					// parse code
					// example code a.Hotellio::Booking::travel::control, Hotellio::Booking::travel::control,Hotellio::Booking::travel::control
					var conditions = {
						'control': 'permission', // control: android permissiosn
						'purpose': 'permpurpose', // permissions + purpose
						'leak': 'tablepl', // 
						'dci':'dci', // 
						'pdci':'pdci', 
					};

					$scope.codeError = '';					

					if (code.length === 0) { $scope.codeError = 'Code is empty'; return; }
					if (!/^[a-e]\./.test(code)) { $scope.codeError = 'Cannot parse code'; return; }

					var group = code[0], rcodes = code.slice(2);

					console.log('group ', group, ' :: round codes', rcodes);

					var pushError = (r) => { 
							$scope.codeError += r + "<br>"; 
							console.error(r);
						}, 	
						rounds = rcodes.trim().split(',').map((rcode) => {
							var parsed = rcode.split('::');

							if (parsed.length !== 4) { 
								console.error('Error on code ', rcode);
								return;
							}

							var appA = parsed[0], appB = parsed[1],
								domain = parsed[2],
								condition = conditions[parsed[3].toLowerCase()];

							if (!appA || $scope.apps.indexOf(appA) < 0) { pushError('No appA called ' + appA); }
							if (!appB || $scope.apps.indexOf(appB) < 0) { pushError('No appB called ' + appB); }
							if (!condition) { pushError('No condition called ' + parsed[3]); }
							return {a:appA, b:appB, cond:condition, domain:domain};
						}).filter((x) => x);

					// 
					console.info("successfully configured ", rounds.length, ' rounds ');

					$scope.rounds = rounds;
					$scope.nRounds = rounds.length;
				};
				// 
				if (!$scope.nRounds) { $scope.nRounds = 20; }
				$scope.doSave = () => {
					try {
						console.info('setting parent -> ', $scope.experiment);
						_.extend($scope.experiment, { 
							_id: $scope.runid,
							cond:$scope.cond,
							participant:$scope.participantid,
							rounds: $scope.rounds,
							created: new Date().valueOf(),
							configured:true
						});
						console.info('done setting parent -> ', $scope.experiment);
						$scope.save().then(() => {
							console.info('save() :: success saving, now state go');
							$state.go('experiment.manage');
						}).catch((e) => {
							console.error('save() :: exception thrown ', e);
						});
					} catch(e) { 
						console.log('error saving ');
						console.error(e);
					}
				};
				window._s = $scope;
			}			
		});


		$stateProvider.state('experiment.run', {
		  	url: '/run',
		  	templateUrl:'tmpl/run.html',
			controller:function($scope, $state, $stateParams, utils) {
				if (!$stateParams.id) { 
					$state.go('experiment.manage');
					return;
				}
				if (!$scope.experiment || $scope.experiment._id !== $stateParams.id) { 
					$scope.load($stateParams.id);
				}
				$scope.selectApps = () => $state.go('experiment.runselect');
				$scope.run = (task) => {
					var tid = $scope.makeTaskId(task);
					console.info('got task id ', tid);
					$state.go('experiment.runtask', {tid:tid});
				};
				$scope.clear = (task, $evt) => {
					$evt.stopPropagation();
					delete task.result;
					$scope.save();
				};
				window._r = $scope;
			}
		});

		$stateProvider.state('experiment.runphase1', {
		  	url: '/runphase1?app&pdci',
		  	templateUrl:'tmpl/run-phase1.html',
			controller:function($scope, $state, $stateParams, utils) {
				if (!$stateParams.id) { 
					$state.go('experiment.manage');
					return;
				}

				if (!$stateParams.app) { throw new Error('app must be specified'); }

				//
				$scope.$watch('experiment', () => {
					console.info('experiment ', $scope.experiment);
					if ($scope.experiment && $stateParams.pdci === 'true') { 
						$scope.pdciApps = ($scope.experiment.pdciApps || []).filter((x) => x !== $stateParams.app);
					} else {
						$scope.pdciApps = undefined;
					}
				});

				$scope.dci = { iface : 'table' };

				$scope.app = $stateParams.app;
				$scope.appcompany = $scope.data.filter((x) => x.app === $scope.app)[0].company;

				window._r = $scope;
			}
		});


		$stateProvider.state('experiment.runselect', {
		  	url: '/runselect',
		  	templateUrl:'tmpl/run-select.html',
			controller:function($scope, $state, $stateParams, utils) {
				// allow people to select apps they're using
				if (!$stateParams.id) { $state.go('experiment.manage'); return;	}
				var init = Promise.resolve();				
				if (!$scope.experiment || $scope.experiment._id !== $stateParams.id) { 
					init = $scope.load($stateParams.id).then(() => console.log('loaded'));
				}
				$scope.realapps = $scope.apps.filter((x) => $scope.fakeapps.indexOf(x) < 0);
				init.then(() => {
					// now we've loaded
					$scope.selected = ($scope.experiment.pdciApps || []).reduce((obj,k) => { obj[k] = true; return obj; }, {});
					$scope.doSave = () => {
						var selected = _($scope.selected).pickBy((v,k) => v).keys().value();
						$scope.experiment.pdciApps = selected;
						$scope.save().then(() => {
							console.info('<< experiment saved', $scope.experiment);
							$state.go('experiment.run', {id:$scope.experiment._id});
						});
					};
				});
			}
		});

		$stateProvider.state('experiment.runtask', {
		  	url: '/runtask?tid',
		  	templateUrl:'tmpl/run-task.html',
			controller:function($scope, $state, $stateParams, $interval, utils) {
				if (!$stateParams.id) { $state.go('experiment.manage'); return;	}
				var init = Promise.resolve();				
				if (!$scope.experiment || $scope.experiment._id !== $stateParams.id) { 
					init = $scope.load($stateParams.id);
				}
				init.then(() => {
					var start_time = new Date().valueOf(),
						data = $scope.data,
						task = $scope.t = $scope.getTask($stateParams.tid),
						timer_int = $interval(() => { $scope.elapsed = (new Date()).valueOf() - start_time; });

					if (['dci','pdci'].indexOf(task.cond) >= 0) {
						console.info('setting iface ');
						$scope.dci = {iface:'table'};
					}

					console.info("GOT task ", task);
					$scope.companies = {
						a:data.filter((x) => x.app === task.a)[0].appcompany,
						b:data.filter((x) => x.app === task.b)[0].appcompany,
					};

					$scope.$watch('experiment', () => {
						if ($scope.experiment && task) { 
							if (task.cond === 'pdci') {
								$scope.pdciApps = ($scope.experiment.pdciApps || []).filter((x) => x !== task.a & x !== task.b);
							} else {
								delete $scope.pdciApps;
							}
						}
					});

					// clear task result before continuing!
					delete task.result;

					$scope.choiceMade = (choice) => {
						console.log('choicemade ', choice);
						var end_time = (new Date()).valueOf();
						$interval.cancel(timer_int);
						task.result = { 
							chosen:choice,
							dci_lastused: ['dci','pdci'].indexOf(task.cond) >= 0 ? $scope.dci.iface : undefined,
							start_time: start_time,
							elapsed: end_time-start_time,
							end_time: end_time,
						};
						$scope.stage = 1;
						$scope.save().then(() => { console.info('save done ', task);	});
					};
					$scope.nextQ = () => $scope.stage++;

					// todo
					$scope.next = () => { 
						var nextState = $scope.findNextState($stateParams.tid);
						if (nextState !== undefined) { 
							console.info('GOING nextState ', nextState);
							$state.go('experiment.runtask', nextState);
						} else {
							$state.go('experiment.manage'); 
						}
					};
					$scope.back = () => { $state.go('experiment.run', {id:$scope.experiment._id}); };
					$scope.$watch('t.result.confidence', () => {
						if ($scope.t && $scope.t.result && $scope.t.result.confidence) { 
							console.log('confidence changed ', $scope.t && $scope.t.result && $scope.t.result.confidence);
							$scope.save().then(() => {
								console.log('saved experiment with task ', $scope.t);
								$scope.next();
							});
						}
					});
					$scope.$on('$destroy', () => $interval.cancel(timer_int));
				});
				window._rs = $scope;
			}
		});
		console.log('yolo');
	});
