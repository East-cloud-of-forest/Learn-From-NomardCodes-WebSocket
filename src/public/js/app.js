const socket = io();
const Chat = document.getElementById("chat");
const Room = document.getElementById("room");
const nameSection = document.getElementById("name");
const enterRoom = document.getElementById("enterRoom");
const msg = document.getElementById("msg");
const namespan = nameSection.querySelector("span");
const chageMainButton = nameSection.querySelector("button");

// 첫 실행
msg.hidden = true;
Chat.hidden = true;
chageMainButton.innerText = "방에 입장해주세요";
chageMainButton.disabled = true;
let roomName;
let mainMode = null;
socket.emit("connecting");

// 화면 변경
function showRoomSection() {
  mainMode = 'room'
  chageMainButton.disabled = false
  chageMainButton.innerText = "채팅방으로 가기";
  Room.hidden = false;
  Chat.hidden = true;
}
function showChatSection() {
  mainMode = 'chat'
  chageMainButton.disabled = false
  chageMainButton.innerText = "방 목록 보기";
  Room.hidden = true;
  Chat.hidden = false;
}
function changeMsgAndRoom(event) {
  event.preventDefault();
  if (mainMode === "chat") {
    showRoomSection();
  } else if (mainMode === "room") {
    showChatSection();
  }
}
chageMainButton.addEventListener("click", changeMsgAndRoom);

// 닉네임 변경
function handleNicknameSubmit(event) {
  event.preventDefault();
  const input = nameSection.querySelector("input");
  socket.emit("nickname", input.value, roomName);
  namespan.innerText = `${input.value}`;
  input.value = "";
}
const nameForm = nameSection.querySelector("form");
nameForm.addEventListener("submit", handleNicknameSubmit);

// 방 입장
function handleRoomName(name, count) {
  const h3 = Chat.querySelector("h3");
  h3.innerText = `${name} (${count})`;
}
function showRoom(countRoom) {
  handleRoomName(roomName, countRoom);
  enterRoom.hidden = true;
  msg.hidden = false;
  msg.addEventListener("submit", handleMessagetSubmit);
}
function handleRoomSubmit(event) {
  event.preventDefault();
  const input = enterRoom.querySelector("input");
  socket.emit("enter_room", input.value, showRoom);
  roomName = input.value;
  input.value = "";
  showChatSection()
}
enterRoom.addEventListener("submit", handleRoomSubmit);

// 메세지 보내기
function addMessage(msg) {
  const ul = Chat.querySelector("ul");
  const li = document.createElement("li");
  li.innerText = msg;
  ul.appendChild(li);
  ul.scrollTop = ul.scrollHeight;
}
function handleMessagetSubmit(event) {
  event.preventDefault();
  const input = msg.querySelector("input");
  const value = input.value;
  socket.emit("new_message", input.value, roomName, () => {
    addMessage(`나 : ${value}`);
  });
  input.value = "";
}

// 방 목록 보기
function addRoomsList(rooms) {
  const roomList = Room.querySelector("ul");
  roomList.innerHTML = "";
  if (rooms.length === 0) {
    roomList.innerHTML = "";
    return;
  }
  rooms.forEach((room) => {
    const li = document.createElement("li");
    li.innerText = room;
    roomList.appendChild(li);
  });
}

socket.on("connecting", (nickname, rooms) => {
  namespan.innerText = nickname;
  addRoomsList(rooms);
});

socket.on("welcome", (user, newCount) => {
  handleRoomName(roomName, newCount);
  addMessage(`${user} 입장`);
});

socket.on("bye", (left, newCount) => {
  handleRoomName(roomName, newCount);
  addMessage(`${left} 퇴장`);
});

socket.on("new_message", (msg) => {
  addMessage(msg);
});

socket.on("room_change", (rooms) => {
  addRoomsList(rooms);
});
