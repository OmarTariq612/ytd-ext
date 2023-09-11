const queryString = window.location.search;
const urlParams = new URLSearchParams(queryString);

const videoURL = decodeURIComponent(urlParams.get('video'));
const audioURL = decodeURIComponent(urlParams.get('audio'));
const filename = decodeURIComponent(urlParams.get('filename'));

const { fetchFile, downloadWithProgress } = FFmpegUtil;
const { FFmpeg } = FFmpegWASM;
let ffmpeg = null;

const transcode = async () => {
  const message = document.getElementById('message');
  if (ffmpeg === null) {
    ffmpeg = new FFmpeg();
    ffmpeg.on("log", ({ message }) => {
      console.log(message);
    })
    ffmpeg.on("progress", ({ progress, time }) => {
      message.innerHTML = `${progress * 100} %, time: ${time / 1000000} s`;
    });


    await ffmpeg.load({
      coreURL: "/ffmpeg/ffmpeg-core.js",
    });
  }

  await ffmpeg.writeFile("audio.m4a", await fetchFile(audioURL));
  await ffmpeg.writeFile("video.mp4", await fetchFile(videoURL));

  message.innerHTML = 'Start transcoding';

  console.time('exec');
  await ffmpeg.exec(['-i', "audio.m4a", '-i', "video.mp4", '-c:v', 'copy', '-c:a', 'aac', filename]);
  console.timeEnd('exec');

  message.innerHTML = 'Complete transcoding';

  const data = await ffmpeg.readFile(filename);
  downloadBlob(new Blob([data.buffer]), filename);
}

transcode();


const downloadBlob = (blob, name) => {
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = name;
  link.click();
}