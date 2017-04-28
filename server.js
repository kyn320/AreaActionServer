//ws://127.0.0.1:8080/socket.io/?EIO=3&transport=websocket
var io = require('socket.io')({
	transports: ['websocket']
, });

var room = {
	id: 0
	, name: "Test"
	, fullPlayers: 0
	, userList: []
	, isPlayed: false
}

var roomList = new Array();

roomList[0] = room;

var USER_COUNT = 0;

var io = io.attach(8080);

console.log("Server is On");

io.on('connection', function (socket) {

	//유저 접속 카운트 갱신 ++
	UserConnect();

	socket.on('login', function (data) {
		socket.id = data.name;
		console.log('[Login]' + new Date() + '\n' + socket.id + ' | ' + data.name);
		//socket.emit('roomList', roomList);
	});

	socket.on('roomList', function (data) {
		socket.emit('roomList', roomList);
	});

	//방 입장 시
	socket.on('join', function (data) {

		var findRoom = FindRoom(data.roomName);
		if (findRoom == null) {
			socket.emit('error', {
				errorCode: 1
			});
			console.log("error!!");
		} else {
			if (!(findRoom.isPlayed)) {
				socket.leave();

				socket.join(data.roomName);
				socket.room = data.roomName;
				JoinRoom(findRoom, socket);
				console.log('[Room]' + data.roomName);
				var obj = {
					name: socket.id
					, character: data.character
				}
				EmitForRoomUsersWithoutMy(findRoom, 'join', obj, socket);
				if (findRoom.userList != null) {
					socket.emit('userList', RoomUserList(findRoom));
					console.log('[asd] : ' + findRoom.userList.length);
					if (findRoom.userList.length == 2) {
						findRoom.isPlayed = true;
						EmitForRoomAllUsers(findRoom, 'start', {
							data: "0"
						});
					}
				}
			} else {
				console.log('[JoinFail]' + findRoom.name + ' is Playing!');
			}
		}
	});

	//채팅 입력 시 
	socket.on('chat', function (data) {
		console.log('[Chat] ' + new Date() + ' : ' + data.name + ' >> ' + data.message);

		var findRoom = FindRoom(socket.room);

		EmitForRoomAllUsers(findRoom, 'chat', data);
	});

	//점수 획득 시
	socket.on('score', function (data) {
		console.log('[Score] : ' + data.name + ' >> ' + data.score + ' >> ' + socket.room);
		var findRoom = FindRoom(socket.room);

		EmitForRoomAllUsers(findRoom, 'score', data);
	});

	//공격 시
	socket.on('attack', function (data) {
		console.log('[Attack] : ' + data.name + ' >> ' + data.damage + '>>' + data.other);

		var obj = {
			name: data.name
			, damage: data.damage
		}

		var findRoom = FindRoom(socket.room);
		var other = FindRoomInUser(findRoom, data.other);

		other.emit('attack', obj);
	});


	//연결 헤제 시
	socket.on('disconnect', function (data) {
		console.log(socket.id +'가 연결이 끊겨써요.');
		
		var findRoom = FindRoom(socket.room);

		if (findRoom != null) {
			console.log('room is not null')

			for (var i = 0; i < findRoom.userList.length; i++) {
				if (socket == findRoom.userList[i]) {
					findRoom.userList.splice(i, 1);
					break;
				}
			}

			console.log(findRoom.userList.length);
			
			if (findRoom.userList.length > 0) {

				EmitForRoomAllUsers(findRoom, 'chat', {
					name: 'Notice'
					, message: socket.id + '님이  나갔어요.'
				});
				EmitForRoomAllUsers(findRoom, 'userList', RoomUserList(findRoom));
			} else {
				console.log(findRoom.name + '의 방은 비어있어요.')
				for (var i = 0; i < roomList.length; i++) {
					if (socket.room == roomList[i].name) {
						roomList.splice(i,1);
						break;
					}
				}
			}
			socket.leave(socket.room);
		} else {
			console.log('null');
		}
		//유저 접속 카운트 갱신 --
		UserDisconnect();
	});

});


function UserConnect() {
	++USER_COUNT;
	UserCountLog(new Date());
}

function UserDisconnect() {
	--USER_COUNT;
	UserCountLog(new Date());
}

function UserCountLog(date) {
	console.log('[UserCount] ' + date + '\n현재 연결중인 유저수는 총 ' + USER_COUNT + " 명");
}

function FindRoom(name) {
	if (roomList != null) {
		for (var i = 0; i < roomList.length; i++) {
			if (name == roomList[i].id + roomList[i].name)
				return roomList[i];
		}
	}
	return null;
}

function FindRoomInUser(room, user) {
	if (room.userList != null) {
		for (var i = 0; i < room.userList.length; i++) {
			if (room.userList[i].id == user)
				return room.userList[i];
		}
	}
	return null;
}

function JoinRoom(room, user) {
	room.userList.push(user);
	console.log('[Room-UserList] : ' + room.userList);
}

function RoomUserList(room) {
	if (room.userList != null) {
		var users = new Array();

		for (var i = 0; i < room.userList.length; i++) {
			users.push(room.userList[i].id);
		}

		var userObj = {
			userList: users
		}

		return userObj;
	}
	return null;
}

function EmitForRoomUsersWithoutMy(room, eventName, obj, socket) {
	if (room.userList != null) {
		for (var i = 0; i < room.userList.length; i++) {
			if (room.userList[i] != socket)
				room.userList[i].emit(eventName, obj);
		}
	}
}

function EmitForRoomAllUsers(room, eventName, obj) {
	if (room.userList != null) {
		for (var i = 0; i < room.userList.length; i++) {
			room.userList[i].emit(eventName, obj);
		}
	}
}