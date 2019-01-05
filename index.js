const express = require('express')
const path = require('path')
const cheerio = require('cheerio');
const rp = require('request-promise');
const convert_xml = require('xml-js');
const cloudscraper = require('cloudscraper')
const cacheMiddleware = require('./caching_middleware')
const kbzurl = 'https://www.kbzbank.com/en/';
const cburl = 'https://www.cbbank.com.mm/admin/api.xml';
const maburl = 'https://www.mabbank.com/foreign-exchange-rate'
const ayaurl = 'https://www.ayabank.com/en_US/'
const PORT = process.env.PORT || 8888;
const middleware = cacheMiddleware.cachingMiddleware
var app = express()


app.get('/kbz', middleware(30), function (req, res){
	if (req.method === 'PUT') {
	  return res.status(403).send('Forbidden!');
	}

	const options = {
		uri: kbzurl,
		transform: function (body) {
			return cheerio.load(body);
		}
	};

	rp(options)
		.then(function ($) {
			var currencyRates = [];
			var exRate = $('div.exchange-rate>div.col-lg-2').first().text()
			var date = exRate.slice(exRate.indexOf("/")-2,exRate.length-2)

			$('div.exchange-rate>div.col-lg-2').each(function(i, foo) {
				if(i != 0){
					const target = $(foo).text()
					currencyRates.push({
						currency: target.slice(0, target.indexOf(" ")).replace('\n\t',''),
						buy: target.slice(target.indexOf("BUY")+4, target.indexOf("SELL")-1),
						sell: target.slice(target.indexOf("SELL")+5, target.length)
					})
				}
			});

			res.send({
				date: date,
				currencyRates: currencyRates
			})
		})
		.catch(function (err) {
			res.send(err);
		});
	
})

app.get('/cb', middleware(30), function (req, res){
	if (req.method === 'PUT') {
		return res.status(403).send('Forbidden!');
	}

	var options = {ignoreComment: true, alwaysChildren: true, compact: true}
	var currencyRates = [];
	var date = ''

	rp(cburl)
		.then(function (target) {
			result = convert_xml.xml2js(target, options)
			result.rates.cbrate.forEach(function(element){
				date = element.date._text
				currencyRates.push({
					currency: element.currency._text,
					buy: element.buy._text,
					sell: element.sell._text,
				})
			})
			res.send({
				date: date,
				currencyRates: currencyRates
				})
		})
		.catch(function (err) {
			res.send(err);
		});
	
})

app.get('/mab', middleware(30), function (req, res){
	if (req.method === 'PUT') {
	  return res.status(403).send('Forbidden!');
	}

	cloudscraper.get(maburl, function(err, respose, body) {
			if(err){
				res.send(err)
			}
			const $ = cheerio.load(body);

			var currencyRates = [{},{},{},{},{},];
			var date = $('div.exchange-box>div.effected>span').text().replace(/ |\n|\t/g,'')
			var data = []

			$('div.exchange-box>article>p').each(function(i,element){
				if(i>2)
					data[i-3] = $(element).text()
			});

			var j = 0 
			var k = 0
			while(j<data.length){
				if(j%3==0)
					currencyRates[k].currency = data[j]
				else if(j%3==1)
					currencyRates[k].buy = data[j]
				else if(j%3==2)
					currencyRates[k].sell = data[j]
				j+=1;
				if(j%3==0){
					k++
				}
			}
			res.send({
				date: date,
				currencyRates: currencyRates
			})
		})
	
})

app.get('/aya', middleware(30), function (req, res){
	if (req.method === 'PUT') {
	  return res.status(403).send('Forbidden!');
	}

	const options = {
		uri: ayaurl,
		transform: function (body) {
			return cheerio.load(body);
		}
	}

	rp(options)
		.then(function ($) {
			var currencyRates = [{},{},{}];
			var data = []
			var date = $('#tablepress-1>tbody>tr>td').first().text().replace(/\n/g,'').trim()
			$('#tablepress-1>tbody>tr>td').each(function(i,element){
				if(i>2 && $(element).html()!=$('#tablepress-1>tbody>tr>td').last().html())
					data[i-3] = $(element).text().replace(/\n|\n/g,'')
			})
			
			var j = 0 
			var k = 0
			while(j<data.length){
				if(j%3==0)
					currencyRates[k].currency = data[j]
				else if(j%3==1)
					currencyRates[k].buy = data[j]
				else if(j%3==2)
					currencyRates[k].sell = data[j]
				j++;
				if(j%3==0){
					k++
				}
			}
			res.send({
				date: date,
				currencyRates: currencyRates
			})
		})
		.catch(function (err) {
			res.send(err);
		});
	
})

app.listen(PORT)
