let dl_queue = []
let dl_count = 0

function begin_dl() {
	try {
		if (dl_count > 3 || dl_queue.length == 0) return
		dl_count++
		let dl = dl_queue.pop()
		if ('downloads' in dl) {
			for (let i = 0; i < dl.downloads.length; i++) {
				chrome.downloads.download({
					url: dl.downloads[i]
				}, (di)=>{
					
				});
			}
		}
		if ('downloads_named' in dl) {
			for (let i = 0; i < dl.downloads_named.length; i++) {
				chrome.downloads.download({
					url: dl.downloads_named[i].url,
					filename: dl.downloads_named[i].name
				}, (di)=>{
					
				});
			}
		}
		if ('new_tabs' in dl) {
			for (let i = 0; i < dl.new_tabs.length; i++) {
				chrome.tabs.create({ url: dl.new_tabs[i], active: false });
			}
		}
	} catch (err) {
		console.log('ERROR: ' + err)
	}
}

function queue_dl(url) {
	dl_queue.unshift(url)
	begin_dl()
}

chrome.downloads.onChanged.addListener((di)=>{
	if (!('state' in di)) return;
	if (!('current' in di.state)) return;
	if (di.state.current == 'interrupted') {
		dl_count--
		begin_dl()
	}
	if (di.state.current == 'complete') {
		chrome.downloads.erase({id: di.id})
		dl_count--
		begin_dl()
	}
})

chrome.runtime.onMessage.addListener( function(evt, sen, res) {
	queue_dl(evt)
});
