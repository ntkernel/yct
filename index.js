var nfcTouchCtrl = {
		last: undefined,
		allow: function() {
			return nfcTouchCtrl.last == undefined;
		},
		start: function() {
			nfcTouchCtrl.last = new Date().getTime();
		},
		stop: function() {
			nfcTouchCtrl.last = undefined;
		}
	};

function onBridgeReadyExtend() {
	WeixinJSBridge.invoke('nfcIsConnect', {
		"scene" : "1|2",
	}, function(res) {
		var errmsg = res.err_msg;
		if (errmsg.indexOf("system:function_not_exist") != -1) {
			alertPopupOpen(hint('IDX.E101'));
		} else if (errmsg.indexOf("nfc_not_support") != -1) {
			alertPopupOpen(hint('IDX.E102'));
		} else if (errmsg.indexOf("nfc_off") != -1) {
			alertPopupOpen(hint('IDX.E103'));
		} else if (errmsg.indexOf(":disconnect") != -1) {
			WeixinJSBridge.invoke('nfcConnect', {}, function(res) {
				var errmsg = res.err_msg;
				if (errmsg.indexOf(":disconnect") != -1) {
					alertPopupOpen(hint('IDX.E104'));
				} else if (errmsg.indexOf(":connect") != -1) {
					initRead();
				}
			});
		} else if (errmsg.indexOf(":connect") != -1) {
			initRead();
		}
		else {
			alertPopupOpen(hint('IDX.E105',errmsg));
		}
	});
	
	WeixinJSBridge.on('onNfcTouch', function() {
		if(nfcTouchCtrl.allow()) {
			initRead();
		}
    });
	
}

function closePopup() {
	alertPopupClose();
	$("#acctPopup").dialog("close");
	$("#upgradeGuidePopup").dialog("close");
}

function initRead() {
	
	if(sessionStorage.openId) {
	
	closePopup();
	nfcTouchCtrl.start();
	
	$.showLoading(hint('IDX.E106'));
	
//	WeixinJSBridge.invoke('nfcGetInfo', {}, function(res) {
//		if ("nfcGetInfo:ok" == res.err_msg) {
//			var sak = "";
//			try {
//				var info = $.parseJSON(res.info);
//				sak = info.NfcA.sak || "";
//			} catch (e) {
//			}
//			var flag = sak.substr(sak.length-2, 1);
//			if((flag != "2") && (flag != "3")) {
//				$.hideLoading();
//				alertPopupOpen(hint('IDX.E108'));
//			}
//			else {
				WeixinJSBridge.invoke('nfcBatchTransceive', {
					"apdus" : $.apduReq([ "00A4000002DDF1", "00A4000002ADF1"]),
					"breakIfFail" : "0"
				}, function(res) {
					if ("nfcBatchTransceive:ok" == res.err_msg) {
						var result = new $.apduResp(res.result);
						var adf1 = result.swAt(2);
						if (adf1 == "6A81" || adf1 == "6A82") {
							readCard();
						} else {
							upgradeQuery();
						}
					}
					else {
						$.hideLoading();
						alert(hint('IDX.E109',res.err_msg));
						nfcTouchCtrl.stop();
					}
				});
//			}
//		} else {
//			$.hideLoading();
//			alert(hint('IDX.E107',res.err_msg));
//		}
//	});
	
	}
	
}

function readCard() {

	WeixinJSBridge.invoke('nfcBatchTransceive', {
		"apdus" : $.apduReq([ "00A4000002DDF1", "00B0950808", "00A4000002ADF3","805C000204" ]),
		"breakIfFail" : "0"
	}, function(res) {
		if ("nfcBatchTransceive:ok" == res.err_msg) {
			var result = new $.apduResp(res.result);
			if (result.isSuccess(2)) {
				$("#cardnumid").text(result.get(2).substring(6, 16));
				$("#cardnumidfull").text(result.get(2).substring(0, 16));
				
				if (result.isSuccess(4)) {
					var hexbal = result.get(4).substring(0, 8);
					var bal = parseInt(hexbal, 16) / 100;
					if(sessionStorage.loaded && $.common.getUrlParam("loaded")) {
						$("#balance").hide(250, function() {
							$("#balance").text(bal.toFixed(2));
							$("#balance").show(500);
						});	
					}
					else {
						$("#balance").text(bal.toFixed(2));
					}
					sessionStorage.loaded = false;
							
					//var paramObj = {
					//		openId: sessionStorage.openId,
					//		loginType: 1,
					//		loadingText: hint('IDX.E115'),
					//		platform: 1
					//};
					//doAcctQueryYCT(paramObj, handleAcct);	
					if(!document.getElementById("maintain")) {
						acctQuery();
					}
					else {
						$.hideLoading();
                                                nfcTouchCtrl.stop();
					}
				} else {
					//$.hideLoading();
					//alert(hint('IDX.E114'));
					//nfcTouchCtrl.stop();
					toQingyuan();
				}
			} else {
				$.hideLoading();
				alert(hint('IDX.E112'));
				nfcTouchCtrl.stop();
			}
		}
		else {
			$.hideLoading();
			alert(hint('IDX.E111',res.err_msg));
			nfcTouchCtrl.stop();
		}
	});

}

//whether qingyuan card
function toQingyuan(){
	WeixinJSBridge.invoke('nfcBatchTransceive', {
		"apdus" : $.apduReq([ "00A404000E325041592E5359532E4444463031", "00A4000002DDF1"]),
		"breakIfFail" : "0"
		}, function(res) {
			if ("nfcBatchTransceive:ok" == res.err_msg) {
				var result = new $.apduResp(res.result);
				var adf1 = result.swAt(2);
				if (adf1 == "6A81" || adf1 == "6A82") {
					//alert("a1");
					$.hideLoading();
					nfcTouchCtrl.stop();
					location.href = "https://www.vfcsz.com/common/index.php";
				} else {
					//alert("a2");
					$.hideLoading();
					alert(hint('IDX.E114'));
					nfcTouchCtrl.stop();
				}
			}
			else {
				//alert("a3");
				$.hideLoading();
				alert(hint('IDX.E114'));
				nfcTouchCtrl.stop();
			}
	});
}

function acctQuery() {
	$.showLoading(hint('IDX.E115'));
	var requestObj = {
			timestamp : $.timestamp(),
			platform : 1,
			userinfo : {
				openid : sessionStorage.openId
			},
			cardnum: $("#cardnumidfull").text()
		};
		
		$.ajax({
			type : "POST",
			url : "/wxapi/YCTAcctQuery",
			crossDomain : true,
			data : $.encode(requestObj),
			dataType : "text",
			success : function(data) {
				var result = Base64.decode(data);
				var resObj = $.parseJSON(result);
				if (resObj.status == 1) {
					handleAcct(resObj);
				} else {
					$.hideLoading();
					nfcTouchCtrl.stop();
					alert('鏌ヨ甯愬彿澶辫触:' + resObj.errmsg);
				}
			}
		});
}

var handleAcct = function(paramObj) {
	//var acctObj = paramObj.respObj;
	var balance = 0.00;
	//if(acctObj.acctresult && acctObj.acctresult.balance) {
		//balance = new Number(acctObj.acctresult.balance).toFixed(2);
	//}
	if(paramObj.balance) {
		balance = new Number(paramObj.balance/100).toFixed(2);
	}
	$("#acctBalance").text(balance);
	if(balance > 0) {
		$("#popupBalance").text($("#balance").text());
		$("#popupAcctBalance").text(balance);
		$("#acctPopupClose").click(function() {
			$("#acctPopup").dialog("close");	
		});
		var btns = $("#acctPopup .recharge-btns").html("");
		var balanceFen = balance * 100;
		if(balanceFen % 5000 == 0) {
			var count = (balanceFen / 5000).toFixed(0);
			for(var i = 1; i <= count; i++) {
				btns.append('<div class="grid"><div class="J_RechargeBtn acct-recharge-btn" amt="' + i*50 + '">' + i*50 + '鍏�</div></div>');
			}
		}
		else {
			var count = Math.floor(balanceFen / 5000).toFixed(0);
			var modBalance = new Number(((balanceFen % 10000)/100).toFixed(2));
			if(modBalance <= 50) {
				count++;
			}
			for(var j = 0; j < count; j++) {
				btns.append('<div class="grid"><div class="J_RechargeBtn acct-recharge-btn" amt="' + (j*50+modBalance).toFixed(2) + '">' + (j*50+modBalance).toFixed(2) + '鍏�</div></div>');
			}
		}
		$("#acctPopup .acct-recharge-btn").click(acctRecharge);
		$("#acctPopup").dialog("open");
		if($("#acctPopup").dialog("getWrap").height() > $(document.body).height()) {
			$("#acctPopup").dialog("getWrap").css("top", $(document.body).height()/5);
		}
	}
	
	$.hideLoading();
	nfcTouchCtrl.stop();

};

function upgradeQuery() {
	WeixinJSBridge.invoke('nfcBatchTransceive', {
		"apdus" : $.apduReq([ "00A4000002DDF1", "00B0950808" ]),
		"breakIfFail" : "0"
	}, function(res) {
		if ("nfcBatchTransceive:ok" == res.err_msg) {
			var result = new $.apduResp(res.result);
			if (result.isSuccess(2)) {
				var requestObj = {
						timestamp : $.timestamp(),
						platform : 1,
						userinfo : {
							openid : sessionStorage.openId
						},
						cardnum: result.get(2).substring(0, 16)
					};
					
				$.ajax({
					type : "POST",
					url : "/wxapi/YCTCpuUpQuery",
					crossDomain : true,
					data : $.encode(requestObj),
					dataType : "text",
					success : function(data) {
						var result = Base64.decode(data);
						var resObj = $.parseJSON(result);
						if (resObj.status == 1) {
							if(resObj.code == "0001") {
								$.hideLoading();
								var ugp = $("#upgradeGuidePopup");
								ugp.find("p").text(hint('IDX.E110'));
								ugp.dialog("open");
								nfcTouchCtrl.stop();
							}
							else if(resObj.code == "0002" || resObj.code == "0003") {
								$.hideLoading();
								alertPopupOpen("璇ュ崱涓嶆敮鎸佺緤鍩庨€氬井淇FC鍏呭€煎姛鑳斤紝璇峰埌缇婂煄閫氭巿鏉冪綉鐐癸紙鍦伴搧銆佽繛閿佷究鍒╁簵绛夛級閲嶆柊璐崱");
								nfcTouchCtrl.stop();
							}
							else if(resObj.code == "9999") {
								$.hideLoading();
								alert('鏌ヨ鍗＄墖鍗囩骇鎯呭喌澶辫触:绯荤粺绻佸繖');
								nfcTouchCtrl.stop();
							}
							else {
								$.hideLoading();
								alert('鏌ヨ鍗＄墖鍗囩骇鎯呭喌澶辫触:' + resObj.code);	
								nfcTouchCtrl.stop();
							}
						} else {
							$.hideLoading();
							alert('鏌ヨ鍗＄墖鍗囩骇鎯呭喌澶辫触:' + resObj.errmsg);
							nfcTouchCtrl.stop();
						}
					}
				});
			} else {
				$.hideLoading();
				alert(hint('IDX.E112'));
				nfcTouchCtrl.stop();
			}
		}
		else {
			$.hideLoading();
			alert(hint('IDX.E111',res.err_msg));
			nfcTouchCtrl.stop();
		}
	});
}

function acctRecharge() {
	$.showLoading(hint('IDX.E118'));
	var requestObj = {
		ordertype : 2,
		cardnum : $("#cardnumid").html(),
		productid : "1",
		totalfee : ($(this).attr("amt") * 100).toFixed(0),
		nfc: true
	};
	unifiedOrder(requestObj, function(order) {
		pay({
			orderid : order.orderid,
			paytype : "CZJ"
		}, function(payment){
			$.showLoading("璇蜂笉瑕佸叧闂〉闈紝骞朵繚鎸佸崱鐗囩揣璐存墜鏈烘劅搴斿尯锛屽嵆灏嗗紑濮嬪厖鍊煎啓鍗°€�");
			setTimeout(function(){toLoadPage(payment);},2000); 
			});
	});
}

function cardNotReady() {
	return $("#cardnumid").text() == "";
}

$(function() {
	
	$("#acctPopup").dialog({
		autoOpen: false,
		closeBtn: false,
		scrollMove: false,
		width: '95%'
	});
	
	$("#upgradeGuidePopup").dialog({
		autoOpen: false,
		closeBtn: false,
        buttons: {
			'鍗囩骇鏂瑰紡': function(){
				location.href = "nfc-card-upgrade-guide.html?t=" + new Date().getTime();
			},
			'鍏抽棴': function(){
				$("#upgradeGuidePopup").dialog("close");
			}
        }
	});
	
	$(".recharge-btn").click(function() {
		
		if(cardNotReady()) {
			alert(hint('IDX.E116'));
			return ;
		}

		$.showLoading(hint('IDX.E118'));
		
		var requestObj = {
				ordertype: 1,
				cardnum: $("#cardnumid").text(),
				productid: "1",
				totalfee: ($(this).attr("amt") * 100).toFixed(0),
				nfc: true
		};
		
		unifiedOrder(requestObj, function(order) {
			pay({
				orderid : order.orderid,
				paytype : "WX"
			}, function(payment) {
				payment.wxRet.orderid = order.orderid;
				payment.wxRet.cardnum = $("#cardnumid").text();
				callWxPay(payment.wxRet, toLoadPage);
			});
		});

	});
	
	$.extend($.ajaxSettings,{
		cache: false,
		timeout : 20000,
		error : function(XMLHttpRequest, textStatus, errorThrown) {
			$.hideLoading();
			nfcTouchCtrl.stop();
			if (textStatus == "timeout") {
				if (timeoutDiv) {
					timeoutDiv.dialog("open");
				}
			}
			else {
				alert(hint('COM.E003',textStatus));
			}
		}
	});
});
