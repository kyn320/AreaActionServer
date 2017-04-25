//ws://127.0.0.1:8080/socket.io/?EIO=3&transport=websocket
var io = require('socket.io')({
	transports: ['websocket'],
});

var USER_COUNT = 0;

var io = io.attach(8080);

console.log("Server is On");


io.on('connection',function(socket){
    
    //유저 접속 카운트 갱신 ++
    UserConnect();
       
    socket.on('login',function(data){
       socket.id = data.nick; 
	   console.log('[Login]'+new Date()+'\n'+socket.id+' | '+data.nick);
    });
    
    //방 입장 시
    socket.on('join',function(data){
        socket.leave();
        socket.join(data.roomName);
        socket.room = data.roomName;
		
		console.log('[Room]'+data.roomName);
		
		var obj = {
			nick : socket.id
			, character : data.character
		}
		
		io.sockets.in(socket.room).('join',obj);
		
    });
    
    //채팅 입력 시 
    socket.on('chat',function(data){
        console.log('[Chat] '+new Date()+' : '+data.nick + ' >> ' + data.message);
        io.sockets.in(socket.room).emit('chat',data);
    });
    
    //점수 획득 시
    socket.on('score',function(data){
        console.log('[Score] : ' + data.nick + ' >> ' + data.score + ' >> '+socket.room);
        io.sockets.in(socket.room).emit('score',data);
    });
    
    //공격 시
    socket.on('attack',function(data){
        console.log('[Attack] : ' + data.nick + ' >> ' + data.damage + '>>' + data.other);
		
		var obj = {
			nick : data.nick
			, damage : data.damage
		}
		
        io.sockets.to(data.other).emit('attack',obj);
    }); 
	
		
    //연결 헤제 시
    socket.on('disconnect',function(data){
       //유저 접속 카운트 갱신 --
        UserDisconnect(); 
    });
	
});


function UserConnect(){
    ++USER_COUNT;
    UserCountLog(new Date());
}

function UserDisconnect(){
    --USER_COUNT;
    UserCountLog(new Date());
}

function UserCountLog(date){
    console.log('[UserCount] '+date+'\n현재 연결중인 유저수는 총 '+ USER_COUNT + " 명");
}