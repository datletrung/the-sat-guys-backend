window.onload = fetchPart();

document.querySelectorAll("button.btn").forEach((e) => {
	e.addEventListener("click", (_) => {
		redirect(e.id);
	});
});

function redirect(part){
	window.open("start_exam.html?id="+exam_id+"&part="+part, "_blank");
}

function fetchPart() {
    let searchParams = new URLSearchParams(window.location.search);
    if (searchParams.has("id")) {
        exam_id = searchParams.get("id");
        $.ajax({
            type: "post",
            url: window.location.origin + window.location.pathname.split("/").slice(0, -1).join('/')+"/"+"exam.php",
            dataType: "json",
            data: {
                request: "fetch_part",
                id: exam_id,
            },
            success: function (data) {
                //console.log(data);
                if (data.status == 200) {
                    var parts = data.data;
					$.each(parts, function(i, el){
						$("#"+el).parent().css("display", "flex");
					});
					subscriber();
                } else if (data.status == 502) {
                    alert(data.errorMessage);
                }
            },
        });
    } else {
        alert("Invalid parameter!");
    }
}


//-----------------------SUBSCRIBER----------------------------
/*
function subscriber(){
	const SUBSCRIBER_URL = `wss://TheSATGuys.gq/subscribe`;
	if (window.WebSocket) {
		var ws = new WebSocket(SUBSCRIBER_URL);
		ws.onopen = (e) => {
			//console.log("Subscriber connected.");
		};

		ws.onmessage = (e) => {
			const data = JSON.parse(e.data);
			//console.log(data);
			if (data.exam_id == id) {
				var part = data.part;
				var score = data.score;
				var tmp = score.split("/");
				var scorePercent = (tmp[0]*100/tmp[1]).toFixed(2);
				if (parseInt(scorePercent) == scorePercent) scorePercent = parseInt(scorePercent);
				$("#result-"+part).html(`
					<p class='result'>Score: ${score} - ${scorePercent}%</p>
					<p class='result'>Time: ${data.time}s</p>
				`);
			}
		};

		ws.onerror = (e) => {
			alert("Websocket error. Cannot update your score automatically.");
			console.log(e);
		};

		ws.onclose = () => {
			alert("Websocket is closed");
		};
	} else {
		alert("Websocket is not supported on your browser. Cannot update your score automatically.");
	}
}
*/

//-----------------------LOCALSTORAGE----------------------------
function subscriber(){
	if (window.localStorage) {
		var x = setInterval(updateMsg, 5000);
	} else {
		alert("localStorage is not supported on your browser. Cannot update your score automatically.");
		return;
	}
	function updateMsg(){
		try {
			var ls = localStorage.getItem("TheSATGuyMsg");
			ls = JSON.parse(ls);
			if (ls.exam_id == exam_id){ //-------check exam id, if match then read, else not our exam
				try {
					ls.part.forEach(function (e) {
						e = JSON.parse(e);
						let partName = e.partName;
						let score = e.score;
						let time = e.time;
						let tmp = score.split("/");
						let scorePercent = (tmp[0]*100/tmp[1]).toFixed(2);
						if (parseInt(scorePercent) == scorePercent) scorePercent = parseInt(scorePercent);
						$("#result-"+partName).html(`
							<p class='result'>Score: ${score} - ${scorePercent}%</p>
							<p class='result'>Time: ${time}s</p>
						`);
					});
				} catch (error) {
				}
			}
		} catch (error) {
		}
	}
}