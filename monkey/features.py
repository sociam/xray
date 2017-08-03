import collections
import itertools


def flattenDict(d, parent_key='', sep='_', ignore_list=None):
    items = []
    for k, v in d.items():
        keepKey = not ignore_list or all(
            keyword not in k for keyword in ignore_list)
        if keepKey:
            new_key = parent_key + sep + k if parent_key else k
            if isinstance(v, collections.MutableMapping):
                items.extend(flattenDict(v, new_key, sep=sep,
                                         ignore_list=ignore_list).items())
            else:
                items.append((new_key, v))
    return dict(items)


flatten = itertools.chain.from_iterable


def tryNumber(s):
    try:
        return float(s)
    except (ValueError, TypeError):
        return s


def getFlatStream(s):
    IGNORE_LIST = [' ']
    return [flattenDict(p, ignore_list=IGNORE_LIST) for p in s]


def getHeaders(flatStream):
    return set(flatten(p.keys() for p in flatStream))


def extract(streams):
    flatStreams = map(getFlatStream, streams)
    streamHeaders = map(getHeaders, flatStreams)
    # collect headers that only appear in all streams at the same time
    commonHeaders = list(set.intersection(*streamHeaders))
    features = {}
    for header in commonHeaders:
        featureStreams = []
        featureType = 'float'
        for flatStream in flatStreams:
            featureStream = [
                tryNumber(p[header]) if header in p else None for p in flatStream]
            featureStreams.append(featureStream)
            type_ = 'float' if float in map(type, featureStream) else 'str'
            featureType = 'str' if featureType == 'str' else type_
        features[header] = {'type': featureType, 'streams': featureStreams}
    return features
