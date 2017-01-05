require(['jquery','bts','ycb','modal','tmpl','face','Sockjs','dFormat'],
		function($,bootstrap,ycb,modal,tmpl,face,Sockjs) {

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

  $(function(){
	  //初始化全局变量
	  top['ycb']={emp:{},query:{},timer:{},cc:{active:{}}};

	  //登陆环信服务
	  $.post(service_ip+'/login',{
		  username:'270449954@qq.com',
		  password:'piji888',
		  status:'Online'
	  },function(data,status){
		  //初始化坐席数据
		  $.extend(top.ycb.emp,data.agentUser);
		  top.ycb.cc = {active:{},signIn:false,mapping:{}};
		  //初始化其他坐席数据
		  initData();
		  getAnsData();
	  });


	  bindEvent();

  });

    //初始化坐席环信数据
	function initData(){
		$.get(service_ip+'/home/initdata',{},function(data,status){
			top.ycb.emp.sessionId = data.sessionId;
			top.ycb.emp.resource = data.resource;
			//启动socket
			start();
		});
	}
	

	//监听事件
	function handleEvent(param){
		console.log(ycb.jsonToString(param));
	}
	//获取当前会话列表
	function getAnsData(){
		//登陆环信服务
		$.get(service_ip+'/v1/Agents/me/Visitors',{},function(data,status){
			if(status == 'success'){
				
			}else{

			}

		});
	}

	
	//建立socket连接
	function Connection(){

		var me = this;
		console.log("ssid:"+top.ycb.emp.sessionId);
		this.sock = new Sockjs(service_ip+"/push?chid=" + top.ycb.emp.sessionId);
		this.sock.onopen = function(){
			startHeartBeat(1000*hbTime);
			clearTimeout(openTimer);
		};

		this.sock.onmessage = function(resp){
			//resp.data  消息体
			var dat = eval('('+resp.data+')') || {};
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

				var hb = ycb.jsonToString({keepalive:  top.ycb.emp.resource});
				console.log(hb);
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