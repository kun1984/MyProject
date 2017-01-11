require(['jquery','Sockjs'],
		function($,Sockjs) {

  var service_ip = "http://"+window.location.host;
  var conn;
  var openTimer = 0;
  var retryDelay = 0;
  var inited = false;
  var RETRY_DELAY = 15000;
  var OPEN_FAIL = 20000;
  var seqId = 0;
  var hbInter = {};
  var hbTime = 2;//秒

  var ssid;
  var sockPath;

  $(function(){

	  //登陆环信服务
	  $.post(service_ip+'/login',{
		  username:'xxx', //环信账号用户名
		  password:'xxx',//环信账密码
		  status:'Online'
	  },function(data,status){
		  initData();
	  });


  });

    //初始化坐席环信数据
	function initData(){
		$.get(service_ip+'/home/initdata',{},function(data,status){
			ssid = data.sessionId;
			sockPath = data.resource;
			//启动socket
			start();
		});
	}
	

	function handleEvent(){
		//...自己业务逻辑
	}
	
	//建立socket连接
	function Connection(){

		var me = this;
		this.sock = new Sockjs(service_ip+"/push?chid=" + ssid);
		this.sock.onopen = function(){
			startHeartBeat(1000*hbTime);
			clearTimeout(openTimer);
		};

		this.sock.onmessage = function(resp){
			//resp.data  消息体
			var dat = eval('('+resp.data+')') || {};


	       // auth 1
			if(dat.authentication){
				auth_step1();
			}

			// auth 2
			else if(dat.authorize){
				auth_step2();
			}

			var that=this;
			function auth_step1(){
				switch(dat.authentication){
				case "token":
					that.send(JSON.stringify({
						token:	ssid
					}));
					break;
				
				case "failed":
					that.close();
					break;

				case "ok":
					break;
				}
			}

			function auth_step2(){
				switch(dat.authorize){
				case "path":
					that.send(JSON.stringify({
						path:	sockPath
					}));
					break;

				case "failed":
					that.close();
					break;

				case "ok":
					break;
				}
			}

			handleEvent(dat);
		};

		this.sock.onclose = function(e){
			me.reconnect();
		};

		this.close = function(){
			if(this.sock) this.sock.close();
			else this.reconnect();
		};

		this.reconnect = function(){
			if(retryDelay) return;
			clearTimeout(openTimer);
			retryDelay = setTimeout(function(){
				retryDelay = 0;
				createConnection();
			}, RETRY_DELAY);
		};


		this.heartbeat = function(){
			if(this.sock){
				var hb = JSON.stringify({keepalive: sockPath});
				this.send(hb);
			}
		};

		this.send = function(msg){
			if(this.sock.readyState === 1){
				this.sock.send(msg);
			}
		};

	}




	//创建连接
	function createConnection(){
		if(conn){
			conn.close();
			conn = null;
		}
		else{
			conn = new Connection();
			clearTimeout(openTimer);
			openTimer = setTimeout(function(){
				createConnection();
			}, OPEN_FAIL);
		}
	}
	//启动socket
	function start(){
		if(!inited){
			inited = true;
			createConnection();
		}
	}
	//socket心跳
	function startHeartBeat(inter){
		//inter 心跳间隔
		if(hbInter) return;
		hbInter = setInterval(function(){
			conn && conn.heartbeat();
		}, inter);
	}

});