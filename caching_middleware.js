const memoryCache = require('memory-cache');
const memCache = new memoryCache.Cache();

exports.cachingMiddleware = (cacheTtl) => {
	return( function(req, res, next){
		const key = '__express__' + req.originalUrl || req.url
		const content = memCache.get(key)
		if(content){
			res.send(content)
			return
		}else{
			res.sendResponse = res.send
            res.send = (body) => {
                memCache.put(key, body, cacheTtl*1000);
                res.sendResponse(body)
            }
            next()
		}
	})
}


