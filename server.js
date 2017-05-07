//ws://127.0.0.1:8080/socket.io/?EIO=3&transport=websocket
var io = require('socket.io')({
	transports: ['websocket']
, });

var roomList = new Array();

var USER_COUNT = 0;

var io = io.attach(8080);

console.log('\n=============\n');
console.log("Server is On");
console.log('Time :  ' + new Date());
console.log('\n=============\n');

io.on('connection', function (socket) {

	//유저 접속 카운트 갱신 ++
	UserConnect();

	//로그인
	socket.on('login', function (data) {
		console.log('[Login]' + new Date() + '\n\t' + socket.id + ' | ' + data.name);
		socket.leave(socket.room);
		socket.join('lobby');
		socket.room = 'lobby';

		//유저의 socket id를 갱신
		socket.emit('login', {
			socketID: socket.id
		});

		io.sockets.in(socket.room).emit('chat', {
			name: "[Join]"
			, message: data.name + "님이 접속 하셨습니다."
		});
	});


	//방 리스트
	socket.on('roomList', function (data) {

		//방 배열을 전송
		socket.emit('roomList', {
			roomLists: roomList
		});

		//완료 패킷을 전송
		socket.emit('roomFinish', {
			a: 1
		});

	});

	//방 생성
	socket.on('make', function (data) {
		//방 모델 생성
		var makeRoom = {
			id: GenerateRandomID(1, 10000)
			, name: data.roomName
			, readyPlayers: 0
			, fullPlayers: data.fullPlayers
			, userList: []
			, isPlayed: false
		};

		//배열에 추가
		roomList.push(makeRoom);

		socket.leave(socket.room);
		//room 입장
		socket.join(makeRoom.id + makeRoom.name);
		//socket의 room 지정
		socket.room = makeRoom.id + makeRoom.name;

		//클라이언트 완료 보내기
		socket.emit('enterRoom', {
			roomName: makeRoom.id + makeRoom.name
		});


		console.log('[RoomInfo-Make]' + new Date() + '\n\tNo. ' + makeRoom.id + ' | ' + makeRoom.name);
	});

	//방 입장
	socket.on('join', function (data) {
		//방을 검색
		var findRoom = FindRoom(data.roomName);

		//방이 없는 경우
		if (findRoom == null) {
			socket.emit('error', {
				errorCode: 1
			});
			console.log("[Error] " + new Date() + '\n' + socket.id + '가 존재하지 않는 방을 요청');
		} else {
			//방이 플레이 중이지 않은 경우
			if (!(findRoom.isPlayed)) {
				//room 나가기
				socket.leave(socket.room);
				//room 입장
				socket.join(data.roomName);
				//socket의 room 지정
				socket.room = data.roomName;

				//클라이언트 완료 보내기
				socket.emit('enterRoom', {
					roomName: data.roomName
				});

			} else {
				//플레이 중인 경우
				console.log('[JoinFail]' + findRoom.name + ' is Playing!');
			}
		}
	});

	//클라이언트의 준비 완료
	socket.on('ready', function (data) {
		//방을 검색
		var findRoom = FindRoom(socket.room);

		//방이 없는 경우
		if (findRoom == null) {
			console.log("[Error] " + new Date() + '\n' + socket.id + '가 존재하지 않는 방을 요청');
		} else {
			//방이 있는 경우

			//유저 모델 생성
			var user = {
				socketID: socket
				, name: data.name
				, character: data.character
			}

			//유저 추가
			findRoom.userList.push(user);


			//다른 클라이언트에게 소켓 아이디를 보냄
			user.socketID = socket.id;

			//추가된 유저를 보냄
			socket.broadcast.to(socket.room).emit('join', user);

			//
			if (findRoom.userList != null) {
				//현재 접속 유저에게 다른 유저들을 보냄
				socket.emit('userList', {
					userList: findRoom.userList
				});

				findRoom.readyPlayers++;


				console.log('[RoomInfo-Ready] : total = ' + findRoom.userList.length + ' | ready =  ' + findRoom.readyPlayers + ' / req = ' + findRoom.fullPlayers);

				//방 배열을 전송
				socket.broadcast.to('lobby').emit('roomList', {
					roomLists: roomList
				});

				//완료 패킷을 전송
				socket.broadcast.to('lobby').emit('roomFinish', {
					a: 1
				});

				//방에 플레이 가능한 인원인 경우
				if (findRoom.readyPlayers == findRoom.fullPlayers) {
					//console.log("play");
					findRoom.isPlayed = true;
					//방의 모든 유저 게임 시작.
					io.sockets.in(socket.room).emit('start', {
						a: 0
					});
				}
			}
		}

	});

	//채팅 입력 시 
	socket.on('chat', function (data) {
		console.log('[Chat] ' + new Date() + ' : ' + data.name + ' >> ' + data.message);

		io.sockets.in(socket.room).emit('chat', data);
	});

	//점수 획득 시
	socket.on('score', function (data) {
		console.log('[Score] : ' + data.name + ' >> ' + data.score + ' >> ' + socket.room);
		io.sockets.in(socket.room).emit('score', data);
	});

	//공격 시
	socket.on('attack', function (data) {
		console.log('[Attack] : ' + data.name + ' >> ' + data.damage + '>>' + data.other);

		io.sockets.in(socket.room).emit('attack', data);

	});

	//체력 회복 및 데미지 공유
	socket.on('hpchange', function (data) {
		io.sockets.in(socket.room).emit('hpchange', data);
	});

	//사망 공유
	socket.on('death', function (data) {
		io.sockets.in(socket.room).emit('death', data);
	});


	//게임방 아웃
	socket.on('out', function (data) {

		var findRoom = FindRoom(socket.room);

		var name = "";

		if (findRoom != null) {
			for (var i = 0; i < findRoom.userList.length; i++) {
				if (socket.id == findRoom.userList[i].socketID) {
					name = findRoom.userList[i].name;
					console.log("[RoomInfo-Out] " + new Date() + '\n\tNo. ' + findRoom.id + ' | ' + findRoom.name + ' >> ' + name);
					findRoom.userList.splice(i, 1);
					findRoom.readyPlayers--;
					break;
				}
			}

			if (findRoom.userList.length > 0) {

				io.sockets.in(socket.room).emit('chat', {
					name: 'Notice'
					, message: name + '님이  나갔어요.'
				});

				io.sockets.in(socket.room).emit('userList', {
					userList: findRoom.userList
				});

				io.sockets.in(socket.room).emit('userOut', {
					a: 1
				});

			} else {
				for (var i = 0; i < roomList.length; i++) {
					if (socket.room == roomList[i].id + roomList[i].name) {
						console.log("[RoomInfo-Remove] " + new Date() + '\n\tNo. ' + roomList[i].id + ' | ' + roomList[i].name);
						roomList.splice(i, 1);
						break;
					}
				}
			}
			socket.leave(socket.room);
			socket.join('lobby');
			socket.room = 'lobby';

			//방 배열을 전송
			io.sockets.in('lobby').emit('roomList', {
				roomLists: roomList
			});

			//완료 패킷을 전송
			io.sockets.in('lobby').emit('roomFinish', {
				a: 1
			});

			socket.emit('out', {
				a: 1
			});

		}
	});


	//연결 헤제 시
	socket.on('disconnect', function (data) {
		//console.log(socket.id + '가 연결이 끊겨써요.');

		var findRoom = FindRoom(socket.room);

		var name = "";

		if (findRoom != null) {
			for (var i = 0; i < findRoom.userList.length; i++) {
				if (socket.id == findRoom.userList[i].socketID) {
					name = findRoom.userList[i].name;
					console.log("[RoomInfo-Out] " + new Date() + '\n\tNo. ' + findRoom.id + ' | ' + findRoom.name + ' >> ' + name);
					findRoom.userList.splice(i, 1);
					findRoom.readyPlayers--;
					break;
				}
			}

			if (findRoom.userList.length > 0) {

				io.sockets.in(socket.room).emit('chat', {
					name: 'Notice'
					, message: name + '님이  나갔어요.'
				});

				io.sockets.in(socket.room).emit('userList', {
					userList: findRoom.userList
				});

				io.sockets.in(socket.room).emit('userOut', {
					a: 1
				});

			} else {
				for (var i = 0; i < roomList.length; i++) {
					if (socket.room == roomList[i].id + roomList[i].name) {
						console.log("[RoomInfo-Remove] " + new Date() + '\n\tNo. ' + roomList[i].id + ' | ' + roomList[i].name);
						roomList.splice(i, 1);
						break;
					}
				}
			}

			socket.leave(socket.room);

			//방 배열을 전송
			io.sockets.in('lobby').emit('roomList', {
				roomLists: roomList
			});

			//완료 패킷을 전송
			io.sockets.in('lobby').emit('roomFinish', {
				a: 1
			});

		} else {
			console.log("[Error] " + new Date() + '\n' + socket.id + '가 존재하지 않는 방을 요청');
		}
		//유저 접속 카운트 갱신 --
		UserDisconnect();
	});

});


function GenerateRandomID(min, max) {
	var ranNum = 0;
	do {
		ranNum = Math.floor(Math.random() * (max - min + 1)) + min;
	} while (CheckID(ranNum));
	return ranNum;
}

function CheckID(id) {
	for (var i = 0; i < roomList.length; i++) {
		if (id == roomList[i].id)
			return true;
	}
	return false;
}


function UserConnect() {
	++USER_COUNT;
	UserCountLog(new Date());
}

function UserDisconnect() {
	--USER_COUNT;
	UserCountLog(new Date());
}

function UserCountLog(date) {
	console.log('\n==========');
	console.log('[UserCount] ' + date + '\n현재 연결중인 유저수는 총 ' + USER_COUNT + " 명");
	console.log('==========\n');
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
			if (room.userList[i].socketID == user)
				return room.userList[i].socketID;
		}
	}
	return null;
}