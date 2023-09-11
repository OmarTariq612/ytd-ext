const { fetchFile } = FFmpegUtil;
const { FFmpeg } = FFmpegWASM;
let ffmpeg = null;

const transcode = async ({ target: { files } }) => {
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

  const [audioFile, videoFile] = getAudioAndVideo(files);
  await ffmpeg.writeFile(audioFile.name, await fetchFile(audioFile));
  await ffmpeg.writeFile(videoFile.name, await fetchFile(videoFile));

  const dotIndex = videoFile.name.lastIndexOf(".");
  const outputFileName = `${videoFile.name.slice(0, dotIndex)}_merged${videoFile.name.slice(dotIndex)}`;

  message.innerHTML = 'Start transcoding';

  console.time('exec');
  await ffmpeg.exec(['-i', audioFile.name, '-i', videoFile.name, '-c:v', 'copy', '-c:a', 'aac', outputFileName]);
  console.timeEnd('exec');

  message.innerHTML = 'Complete transcoding';

  const data = await ffmpeg.readFile(outputFileName);
  downloadBlob(new Blob([data.buffer]), outputFileName);
}

const elm = document.getElementById('uploader');
elm.addEventListener("change", transcode);

const getAudioAndVideo = (files) => {
  if (!files) {
    console.error("you didn't choose file");
  }

  let filesArray = [];
  for (let i = 0; i < files.length; i++) {
    filesArray[i] = files[i];
  }

  const videoFiles = filesArray.filter((file) => file.type.startsWith('video'));
  if (videoFiles.length === 0) {
    console.error("no video found");
    return;
  }

  const audioFiles = filesArray.filter((file) => file.type.startsWith('audio'));
  if (audioFiles.length === 0) {
    console.error("no audio found");
    return;
  }

  return [audioFiles[0], videoFiles[0]];
}

const downloadBlob = (blob, name) => {
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = name;
  link.click();
}