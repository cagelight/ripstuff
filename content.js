function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function rip(stuff) {
	console.log('ripping: ' + stuff)
	if (Array.isArray(stuff)) {
		chrome.runtime.sendMessage({
			downloads: stuff
		})
	} else {
		chrome.runtime.sendMessage({
			downloads: [stuff]
		})
	}
}

function rip_named(url, name) {
	chrome.runtime.sendMessage({
		downloads_named: [{url: url, name: name}]
	})
}

function rip_tab(stuff) {
	if (Array.isArray(stuff)) {
		chrome.runtime.sendMessage({
			new_tabs: stuff
		})
	} else {
		chrome.runtime.sendMessage({
			new_tabs: [stuff]
		})
	}
}

function display_message(msg) {
	let err = document.createElement('span')
	err.innerText = msg
	err.style.position = 'fixed'
	err.style.left = '5px'
	err.style.top = '5px'
	err.style.padding = '3px'
	err.style.backgroundColor = '#F80'
	err.style.fontWeight = 'bold'
	err.style.color = '#000'
	err.style.border = '2px solid #000'
	err.style.borderRadius = '5px'
	err.style.fontSize = '20px'
	err.style.zIndex = 999999999
	document.body.appendChild(err)
	setTimeout(()=>{
		document.body.removeChild(err)
	}, 2000)
}

function rip_image() {
	if (document.body.children.length != 1) return false
	if (document.body.children[0].tagName != 'IMG') return false
	rip(document.body.children[0].src)
	return true
}

/*
function tumblr_hires(src) {
	let strs = src.split('_')
	let strs2 = strs.pop().split('.', 2)
	str = strs.join('_') + '_raw.' + strs2[1]
	strs = str.split('/');
	return 'http://data.tumblr.com/' + strs[3] + '/' + strs[4];
}
*/

function tumblr_hires(src) {
	let strs = src.split('_')
	let strs2 = strs.pop().split('.', 2)
	str = strs.join('_') + '_1280.' + strs2[1]
	strs = str.split('/');
	return 'http://78.media.tumblr.com/' + strs[3] + '/' + strs[4];
}

async function rip_tumblr() {
	let locsplit = window.location.href.split('/')
	if (!locsplit[2].includes('tumblr.com')) return false
	
	let type = locsplit[3]
	
	if (type == 'post') {
		display_message('CANNOT RIP POSTS, TUMBLR STYLING TOO UNPREDICTABLE')
	} else if (type == 'image') {
		let ary = document.getElementsByTagName('source')[1].srcset.split(' ')
		rip(tumblr_hires(ary[ary.length - 2]))
	} else {
		let srcs = document.getElementsByTagName('img');
		if (srcs.length == 1)
			rip(tumblr_hires(srcs[0].src))
	}
	
	return true
}

async function rip_fa() {
	let locsplit = window.location.href.split('/')
	let type = locsplit[3]
		
	if (type == 'view') {
		let as = document.getElementsByTagName('a');
		for (let i = 0; i < as.length; i++){
			a=as[i];
			if (a.textContent != 'Download') continue;
			rip(a.href)
			display_message('RIP QUEUED')
			return true
		}
	}
	
	let user = locsplit[4]
	
	if (type == 'gallery' || type == 'scraps' || type == 'msg') {
		let img_figures = document.getElementsByClassName('t-image')
		display_message('STARTING RIP OF ' + img_figures.length + ' IMAGES')
		for (let i = 0; i < img_figures.length; i++) {
			await sleep(500)
			let req = new XMLHttpRequest()
			req.addEventListener("load", function(){
				let as = this.responseXML.getElementsByTagName('a');
				for (let i = 0; i < as.length; i++){
					let a = as[i];
					if (a.textContent != 'Download') continue;
					rip(a.href)
					break
				}
			});
			req.responseType = "document"
			req.open('GET', img_figures[i].children[0].children[0].children[0].href);
			req.send()
			console.log(img_figures[i].children[0].children[0].children[0].href)
		}
		display_message('RIP QUEUED')
	} else {
		throw 'unknown furaffinity page type: expecting "gallery", "scraps", or "view"'
	}
	
	return true
}

async function rip_e621() {
	let locsplit = window.location.href.split('/')
	if (locsplit[3] != 'post') {
		throw 'unknown e621 page type, "post/index" and "post/show" accepted'
	}
	
	if (locsplit[4] == 'index') {
		let url = 'https://e621.net/post/index.json?page=' + locsplit[5] + '&tags=' + locsplit[6]
		let req = new XMLHttpRequest()
		req.addEventListener("load", function(){
			let dat = JSON.parse(this.responseText)
			for (let i = 0; i < dat.length; i++) {
				rip(dat[i].file_url)
			}
		});
		req.open('GET', url);
		req.send()
	} else if (locsplit[4] == 'show') {
		let url = 'https://e621.net/post/show.json?id=' + locsplit[5]
		let req = new XMLHttpRequest()
		req.addEventListener("load", function(){
			let dat = JSON.parse(this.responseText)
			rip(dat.file_url)
		});
		req.open('GET', url);
		req.send()
	} else {
		throw 'unknown e621 page type, "post/index" and "post/show" accepted'
	}
	
	display_message('RIP QUEUED')
	return true
}

async function rip_patreon() {
	let locsplit = window.location.href.split('/')
	if (locsplit[3] != 'posts') {
		throw 'unknown patreon page type, "posts" accepted'
	}
	
	let q=window.location.href.split('?');
	let s=q[0].split('-');
	let x=new XMLHttpRequest();
	x.onreadystatechange = function(){
		if (this.readyState == 4 && this.status == 200) {
			let d = JSON.parse(this.responseText);
			rip_named(d.data.attributes.post_file.url, d.data.attributes.post_file.name)
		}
	};
	x.open('GET', 'https://www.patreon.com/api/posts/'+s[s.length-1], true);
	x.send();
	
	display_message('RIP QUEUED')
	return true
}

async function rip_twitter() {
	let img = document.getElementsByClassName('Gallery-media')[0].children[0].src
	img = img.substring(0, img.length - 6)
	rip(img + ":orig")
	
	display_message('RIP QUEUED')
	return true
}

async function rip_newgrounds() {
	let img = document.getElementById('portal_item_view')
	if (!img) {
		display_message('RIPPABLE IMAGE NOT FOUND')
		return true
	}
	
	rip(img.href)
	display_message('RIP QUEUED')
	return true
}

async function rip_pixiv() {
	let locsplit = window.location.href.split('/')
	if (locsplit[3].includes('mode=manga&')) {
		let imgs = document.getElementsByClassName('manga')
		if (!imgs) throw 'CANNOT RIP, MUST BE ON "manga" PAGE'
		let tabs = []
		for (let i = 1; i < imgs[0].childElementCount; i += 1) {
			tabs.push(imgs[0].children[i].children[1].href)
		}
		display_message('OPENING ' + tabs.length + ' TABS')
		rip_tab(tabs)
		return true
	}
	
	if (locsplit[3].includes('mode=manga_big')) {
		let new_href = document.getElementsByTagName('img')[0].src
		if (location.href == new_href)
			display_message('RIP IMPOSSIBLE, MANUAL DOWNLOAD REQUIRED')
		else
			location.href = new_href
		return true
	}
	
	return true
}

async function rip_func(func, inurl = "") {
	if (inurl) {
		let locsplit = window.location.href.split('/')
		if (Array.isArray(inurl)) {
			let match = false
			for (let i = 0; i < inurl.length; i += 1) {
				if (locsplit[2].includes(inurl[i])) match = true
			}
			if (!match) return false
		} else {
			if (!locsplit[2].includes(inurl)) return false
		}
	}
	let stat = await func()
	return stat
}

async function rip_action() {
	
	try {
		if (await rip_func(await rip_tumblr, 'tumblr.com')) return;
		if (await rip_func(await rip_fa, 'furaffinity')) return;
		if (await rip_func(await rip_e621, 'e621.net')) return;
		if (await rip_func(await rip_patreon, 'patreon.com')) return;
		if (await rip_func(await rip_twitter, 'twitter.com')) return;
		if (await rip_func(await rip_newgrounds, 'newgrounds.com')) return;
		if (await rip_func(await rip_pixiv, ['pixiv.net', 'pximg.net'])) return;
		if (await rip_func(await rip_image)) return;
		display_message('unknown site')
	} catch (err) {
		display_message('error: ' + err)
	}
}

rip_action()
