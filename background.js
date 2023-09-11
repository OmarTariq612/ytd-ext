async function download(url) {
  const regex = /https:\/\/www\.youtube\.com\/watch\?v=([\w\-]+)/;
  const videoId = regex.exec(url)?.[1];
  if (!videoId) {
    return { valid: false };
  }

  const headers = { 'X-youtube-client-name': '3', 'X-youtube-client-version': '17.31.35', 'Origin': 'https://www.youtube.com', 'User-agent': 'com.google.android.youtube/17.31.35 (Linux; U; Android 11) gzip', 'Content-type': 'application/json' };
  const data = `{"context": {"client": {"clientName": "ANDROID", "clientVersion": "17.31.35", "androidSdkVersion": 30, "userAgent": "com.google.android.youtube/17.31.35 (Linux; U; Android 11) gzip", "hl": "en", "timeZone": "UTC", "utcOffsetMinutes": 0}}, "videoId": "${videoId}", "params": "CgIQBg==", "playbackContext": {"contentPlaybackContext": {"html5Preference": "HTML5_PREF_WANTS"}}, "contentCheckOk": true, "racyCheckOk": true}`;
  const resp = await fetch('https://www.youtube.com/youtubei/v1/player?key=AIzaSyA8eiZmM1FaDVjRy-df2KTyQ_vz_yYM39w&prettyPrint=false', {
    method: "POST",
    body: data,
    headers: headers
  });
  const resp_json = await resp.json();

  const videoAndAudio = []
  for (const format of resp_json.streamingData.formats) {
    videoAndAudio.push(format);
  }
  const video = videoAndAudio.reduce((prev, curr) => (prev.itag > curr.itag) ? prev : curr);

  const qualityLabelIndex = {
    "144p": 0,
    "144ps": 1,
    "144p HDR": 2,
    "144p60": 3,
    "144p60 HDR": 4,

    "240p": 5,
    "240s": 6,
    "240p HDR": 7,
    "240p60": 8,
    "240p60 HDR": 9,

    "360p": 10,
    "360s": 11,
    "360p HDR": 12,
    "360p60": 13,
    "360p60 HDR": 14,

    "480p": 15,
    "480s": 16,
    "480p HDR": 17,
    "480p60": 18,
    "480p60 HDR": 19,

    "720p": 20,
    "720s": 21,
    "720p HDR": 22,
    "720p60": 23,
    "720p60 HDR": 24,

    "1080p": 25,
    "1080s": 26,
    "1080p HDR": 27,
    "1080p60": 28,
    "1080p60 HDR": 29,

    "1440p": 30,
    "1440s": 31,
    "1440p HDR": 32,
    "1440p60": 33,
    "1440p60 HDR": 34,

    "2160p": 35,
    "2160s": 36,
    "2160p HDR": 37,
    "2160p60": 38,
    "2160p60 HDR": 39,

    "4320p": 40,
    "4320s": 41,
    "4320p HDR": 42,
    "4320p60": 43,
    "4320p60 HDR": 44,
  };

  let bestAudio = null;
  const formatsMap = new Map();
  for (const format of resp_json.streamingData.adaptiveFormats) {
    const [type, ext] = format.mimeType.split(";")[0].split("/");
    if (ext !== "mp4") {
      continue;
    }

    // if (type === "video" && qualityLabelIndex.hasOwnProperty(format.qualityLabel) && qualityLabelIndex.hasOwnProperty(video.qualityLabel) && qualityLabelIndex[format.qualityLabel] >= qualityLabelIndex[video.qualityLabel]) {
    if (type === "video") {
      if (!formatsMap.has(format.qualityLabel) || format.averageBitrate > formatsMap.get(format.qualityLabel)["averageBitrate"])
        formatsMap.set(format.qualityLabel, format)
    } else if (type === "audio") {
      if (!bestAudio || bestAudio.averageBitrate < format.averageBitrate) {
        bestAudio = format;
      }
    }
  }

  const videoOnly = [...formatsMap.values()];
  // videoOnly.sort((a, b) => qualityLabelIndex[a.qualityLabel] - qualityLabelIndex[b.qualityLabel]);
  videoOnly.sort((a, b) => qualityLabelIndex[b.qualityLabel] - qualityLabelIndex[a.qualityLabel]);
  const title = resp_json.videoDetails.title;

  return {
    valid: true,
    title: title,
    bestVideo: video,
    bestAudio: bestAudio,
    videoOnly: videoOnly
  };
}

const handlers = {
  "getCurrentYtVideoInfo": getCurrentYtVideoInfo,
  "download": downloadRequest,
  "downloadAndMerge": downloadAndMerge,
  "merge": merge
};

async function getCurrentYtVideoInfo(request, sender, sendResponse) {
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });

  try {
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: download,
      args: [tab.url]
    });
    console.log(result);
    sendResponse(result);

  } catch (ex) {
    console.log(ex);
    sendResponse(null);
  }
}

function slugify(str) {
  const notAcceptableChars = "\\/:*?\"<>|#";
  let resultStr = "";
  for (const c of str) {
    resultStr += (notAcceptableChars.indexOf(c) == -1) ? c : "_";
  }
  return resultStr;
}

async function downloadRequest(request, sender, sendResponse) {
  try {
    await chrome.downloads.download({
      filename: slugify(request.filename),
      url: request.url
    });
  } catch (ex) {
    console.log(ex);
    console.log(request.filename);
    try {
      // download without name
      await chrome.downloads.download({
        url: request.url
      });
    } catch (ex) {
      console.log(ex);
    }
  }
}

function downloadAndMerge(request, sender, sendResponse) {
  const urlParams = request.urlParams;
  chrome.tabs.create({
    url: `${chrome.runtime.getURL("download_and_merge.html")}?${urlParams}`,
    selected: true
  });
}

function merge(request, sender, sendResponse) {
  chrome.tabs.create({
    url: chrome.runtime.getURL("merge.html"),
    selected: true
  });
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  const { method, request } = msg;

  if (!handlers.hasOwnProperty(method)) {
    console.log(`${method} is not a valid handler name`);
    return;
  }

  (async () => {
    await handlers[method](request, sender, sendResponse);
  })();

  return true;
});