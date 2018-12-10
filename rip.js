function execute_rip() {
	chrome.tabs.executeScript({
		file: 'content.js'
	})
}

chrome.commands.onCommand.addListener(function(command) {
	execute_rip()
});
