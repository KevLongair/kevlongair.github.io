function OnReady() {
	var resultsDiv = document.getElementById("text");
    var paragraphs = resultsDiv.getElementsByTagName("p");
    var paragraph = paragraphs[0];

	fetch("file.txt")
    	.then(response => response.text())
        .then((data) => {
        	console.log(data);
        	paragraph.textContent = data;
		});
}

document.addEventListener("DOMContentLoaded", OnReady);