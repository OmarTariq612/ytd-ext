document.addEventListener("DOMContentLoaded", async () => {
  const div = document.getElementById("area");
  const response = await chrome.runtime.sendMessage({ method: "getCurrentYtVideoInfo" });
  // div.style.backgroundColor = "#0f0f0f";
  div.style.display = "flex";

  const mergeButton = setupMergeButton({ innerHTML: "Merge" });
  mergeButton.style.margin = "auto";
  div.replaceChildren(mergeButton);

  if (!response) {
    console.log("Not a valid URL");
    return;
  }
  if (!response.valid) {
    console.log("Not a youtube video");
    return;
  }

  const { title, bestVideo, bestAudio, videoOnly } = response;

  const videoButton = setupDownloadButton({ innerHTML: `Video + Audio (${bestVideo.qualityLabel})`, url: bestVideo.url, filename: `${title}.mp4` });
  const audioButton = setupDownloadButton({ innerHTML: "Audio Only", url: bestAudio.url, filename: `${title}.m4a` });
  const videoOnlyButtons = []
  const audioMergeButtons = []


  for (const video of videoOnly) {
    const videoOnlyButton = setupDownloadButton({ innerHTML: `Video (${video.qualityLabel})`, url: video.url, filename: `${title}.mp4` });
    videoOnlyButtons.push(videoOnlyButton);

    const audioMergeButton = setupDownloadAndMergeButton({ innerHTML: "+ Audio", videoURL: video.url, audioURL: bestAudio.url, filename: `${title}.mp4` });
    audioMergeButtons.push(audioMergeButton);
  }

  const newThing = videoOnlyButtons.map((n, index) => {
    const plusAudioButton = audioMergeButtons[index];
    return [n, plusAudioButton, document.createElement('br')];
  }).flat().slice(0, -1);

  // const newThing = videoOnlyButtons.map((n, index) => {
  //   const plusAudioButton = audioMergeButtons[index];
  //   return [n, plusAudioButton, document.createElement('br')];
  // }).flat();

  const outerDiv = document.createElement("div");
  // outerDiv.style.margin = "auto";
  outerDiv.append(setupMergeButton({ innerHTML: "Merge" }), document.createElement("br"), videoButton, document.createElement('br'), audioButton, document.createElement('br'), ...newThing);
  // outerDiv.append(videoButton, document.createElement('br'), audioButton, document.createElement('br'), ...newThing, setupMergeButton({ innerHTML: "Merge" }));
  div.replaceChildren(outerDiv);

});

function setupDownloadButton({ innerHTML, url, filename }) {
  const button = document.createElement("button");
  button.innerHTML = innerHTML;
  button.onclick = () => {
    chrome.runtime.sendMessage({ method: "download", request: { url, filename } });
  };
  button.style.margin = "8px";
  button.className = "btn btn-success";

  return button;
}

function setupDownloadAndMergeButton({ innerHTML, videoURL, audioURL, filename }) {
  const button = document.createElement("button");
  button.innerHTML = innerHTML;
  let urlParams = `video=${encodeURIComponent(videoURL)}&audio=${encodeURIComponent(audioURL)}&filename=${encodeURIComponent(filename)}`;

  button.onclick = () => {
    chrome.runtime.sendMessage({ method: "downloadAndMerge", request: { urlParams } });
  };
  button.style.margin = "8px";
  button.className = "btn btn-success";

  return button;
}

function setupMergeButton({ innerHTML }) {
  const button = document.createElement("button");
  button.innerHTML = innerHTML;
  button.onclick = () => {
    chrome.runtime.sendMessage({ method: "merge", });
  };
  button.style.margin = "8px";
  button.className = "btn btn-primary";

  return button;
}