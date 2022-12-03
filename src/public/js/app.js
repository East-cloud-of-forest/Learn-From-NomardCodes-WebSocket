const socket = io();

const myFace = document.getElementById("myFace");
const muteBtn = document.getElementById("mute");
const cameraBtn = document.getElementById("camera");
const camerasSelect = document.getElementById("cameras");

const welcome = document.getElementById("welcome");
const call = document.getElementById("call");
const chat = document.getElementById("chat");
const chatlist = chat.querySelector("ul");
const snedChat = chat.querySelector("button");

call.style.display = "none";
chat.hidden = true;

let myStream;
let muted = false;
let cameraOff = false;
let roomName;
let myPeerConnection;
let myDataChannel;
let nickname;
let sender

async function getCameras() {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const cameras = devices.filter((device) => device.kind === "videoinput");
    const currentCamera = myStream.getVideoTracks()[0];
    cameras.forEach((camera) => {
      const option = document.createElement("option");
      option.value = camera.deviceId;
      option.innerText = camera.label;
      if (currentCamera.label === camera.label) option.selected = true;
      camerasSelect.appendChild(option);
    });
  } catch (e) {
    console.log(e);
  }
}

async function getMedia(deviceId) {
  const initialConstrains = {
    audio: true,
    video: { facingMode: "user" },
  };
  const cameraConstraints = {
    audio: true,
    video: { deviceId: { exact: deviceId } },
  };
  try {
    myStream = await navigator.mediaDevices.getUserMedia(
      deviceId ? cameraConstraints : initialConstrains
    );
    myFace.srcObject = myStream;
    if (!deviceId) await getCameras();
  } catch (e) {
    console.log(e);
  }
}

function handleMuteClick() {
  myStream
    .getAudioTracks()
    .forEach((track) => (track.enabled = !track.enabled));
  if (!muted) {
    muteBtn.innerText = "🔈";
    muteBtn.style.backgroundColor = "#ff5252";
    muted = true;
  } else {
    muteBtn.innerText = "🔊";
    muteBtn.style = "";
    muted = false;
  }
}
function handleCameraClick() {
  myStream
    .getVideoTracks()
    .forEach((track) => (track.enabled = !track.enabled));
  if (cameraOff) {
    cameraBtn.innerText = "🎥";
    cameraBtn.style = "";
    cameraOff = false;
  } else {
    cameraBtn.innerText = "⛔";
    cameraBtn.style.backgroundColor = "#ff5252";
    cameraOff = true;
  }
}
async function handleCameraChange() {
  await getMedia(camerasSelect.value);
  if (myPeerConnection) {
    const videoTrack = myStream.getVideoTracks()[0];
    const videoSender = myPeerConnection
      .getSenders()
      .find((sender) => sender.track.kind === "video");
    videoSender.replaceTrack(videoTrack);
  }
}

muteBtn.addEventListener("click", handleMuteClick);
cameraBtn.addEventListener("click", handleCameraClick);
camerasSelect.addEventListener("input", handleCameraChange);

// welcome form

welcomeForm = welcome.querySelector("form");

async function initCall() {
  welcome.hidden = true;
  call.style.display = "flex";
  chat.hidden = false;
  await getMedia();
  makeConection();
}

async function handleWelcomeSubmit(event) {
  event.preventDefault();
  const roomnameInput = document.getElementById("roomname");
  const nicknameInput = document.getElementById("nickname");
  await initCall();
  socket.emit("join_room", roomnameInput.value, () => {
    addChat(`${nickname} 입장`);
  });
  roomName = roomnameInput.value;
  roomnameInput.value = "";
  nickname = nicknameInput.value;
  nicknameInput.value = "";
}

welcomeForm.addEventListener("submit", handleWelcomeSubmit);

// socket code

socket.on("welcome", async () => {
  myDataChannel = myPeerConnection.createDataChannel("chat");
  myDataChannel.addEventListener("message", (event) => {
    addChat(event.data);
  });
  const offer = await myPeerConnection.createOffer();
  myPeerConnection.setLocalDescription(offer);
  socket.emit("offer", offer, roomName);
});

socket.on("offer", async (offer) => {
  myPeerConnection.addEventListener("datachannel", (event) => {
    myDataChannel = event.channel;
    myDataChannel.addEventListener("message", (event) => {
      addChat(event.data);
    });
    myDataChannel.send(`${nickname} 입장`);
  });
  myPeerConnection.setRemoteDescription(offer);
  const answer = await myPeerConnection.createAnswer();
  myPeerConnection.setLocalDescription(answer);
  socket.emit("answer", answer, roomName);
});

socket.on("answer", (answer) => {
  myPeerConnection.setRemoteDescription(answer);
});

socket.on("ice", (ice) => {
  myPeerConnection.addIceCandidate(ice);
});

socket.on("close", async () => {
  console.log(myPeerConnection)
  await myPeerConnection.removeTrack(sender)
  console.log(myPeerConnection)
  myPeerConnection.close()
});

// RTC Code

function makeConection() {
  myPeerConnection = new RTCPeerConnection({
    iceServers: [
      {
        urls: [
          "stun:stun.l.google.com:19302",
          "stun:stun1.l.google.com:19302",
          "stun:stun2.l.google.com:19302",
          "stun:stun3.l.google.com:19302",
          "stun:stun4.l.google.com:19302",
        ],
      },
    ],
  });
  myPeerConnection.addEventListener("icecandidate", handleIce);
  myPeerConnection.addEventListener("addstream", handleAddStream);
  myStream
    .getTracks()
    .forEach((track) => sender = myPeerConnection.addTrack(track, myStream));
}

function handleIce(data) {
  socket.emit("ice", data.candidate, roomName);
}

function handleAddStream(data) {
  const peerFace = document.getElementById("peerFace");
  peerFace.srcObject = data.stream;
}

// data channel
function addChat(msg) {
  const li = document.createElement("li");
  li.innerText = msg;
  chatlist.appendChild(li);
  chatlist.scrollTop = chatlist.scrollHeight;
}

function handleChat(event) {
  event.preventDefault();
  const input = chat.querySelector("input");
  if (myDataChannel) {
    addChat(`${nickname} : ${input.value}`);
    myDataChannel.send(`${nickname} : ${input.value}`);
  } else {
    addChat(`상대방이 없습니다.`);
  }
  input.value = "";
}

snedChat.addEventListener("click", handleChat);
