
var _ = require('lodash'),
	dev_model = 'iPhone7,1', dev_os = 'iOS', dev_osv = '9.3.2',
	// dev_ids = [
	// 	'99f4174e-a46c-4083-85fd-717fb4b53d44', // android
	// 	'd9fc26b5-c0c8-49f9-a510-f58b5e773541', // android
	// 	'58278AC7-868C-495B-A9F4-3E008493081A', // ios
	// ],
	isstr = (x) => typeof x === 'string',
	detectors = [
		{
			type:'DEVICE_SOFT', 
			kv : (k,v) => isstr(v) &&
				[dev_model, dev_os, dev_osv].map((x) => x.toLowerCase()).indexOf(v.toLowerCase()) >= 0
		},
		{
			type:'DEVICE_SOFT', 
			kv : (k,v) => isstr(v) &&			
				_.some(['iphone','ios','android','apple'], (frag) => v.toLowerCase().indexOf(frag) >= 0)
		},
		{ 
			type:'DEVICE_ID', 
			kv:(k,v) => isstr(v) && (
				// v.toLowerCase().indexOf('ifa:') >= 0 || 
				v.toLowerCase().search(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/) >= 0)
		},
		{ 
			type:'USER_LOCATION_COARSE', 
			kv:(k,v) => ['city','country','country_code'].indexOf(k.toLowerCase()) >= 0 || (isstr(v) && 'gb' === v)
		},
		{ 
			type:'USER_LOCATION',
			kv:(k,v) => false || // ['lat','lon','lng'].indexOf(k.toLowerCase()) >= 0 || 
					isstr(v) && (
						v.indexOf('.') >= 0 && (
						/^[-+]?([1-8]?\d(\.\d+)?|90(\.0+)?),\s*[-+]?(180(\.0+)?|((1[0-7]\d)|([1-9]?\d))(\.\d+)?)$/.test(v) ||
						/^-?([1-8]?[1-9]|[1-9]0)\.{1}\d{1,6}$/.test(v)
						// /^(\+|-)?(?:90(?:(?:\.0{1,6})?)|(?:[0-9]|[1-8][0-9])(?:(?:\.[0-9]{1,6})?))$/.test(v) || // latitude
						// /^(\+|-)?(?:180(?:(?:\.0{1,6})?)|(?:[0-9]|[1-9][0-9]|1[0-7][0-9])(?:(?:\.[0-9]{1,6})?))$/.test(v) // longitude
					))
		},
		{
			// name, email, gender, age, home address, postcode 
			type:'USER_PERSONAL_DETAILS', 
			kv:(k,v) => ['age','gender','name'].indexOf(k.toLowerCase()) >= 0 ||
				isstr(v) && _.some(['age','gender','name'], (frag) => v.toLowerCase().indexOf(frag) >= 0)
		},
		{
			// name, email, gender, age, home address, postcode 
			type:'USER_ACTIVITY', 
			kv:(k,v) => { } 
		}
	];

exports.detectors = detectors;








