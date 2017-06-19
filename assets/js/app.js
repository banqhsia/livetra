$(function () {
  
  'use strict';
  
  const trainType = {"1115":"莒光號", //（有身障座位 ,有自行車車廂）
                     "1108":"自強號", //（推拉式自強號且無自行車車廂）
                     "1100":"自強號", //（DMU2800、2900、3000型柴聯及 EMU型電車自強號）
                     "1101":"自強號", //（推拉式自強號）
                     "1102":"太魯閣號",
                     "1107":"普悠瑪號",
                     "1110":"莒光號", //（無身障座位）
                     "1120":"復興號",
                     "1131":"區間車",
                     "1132":"區間快",
                     "1140":"普快車",
                     "1111":"莒光號",
                     "1103":"自強號",
                     "1114":"莒光號"}; //（無身障座位 ,有自行車車廂）
  //trainType先寫死 http://ptx.transportdata.tw/MOTC/v2/Rail/TRA/TrainType?$format=JSON

  const store = new Vuex.Store({
    state: {
      lines: [],
      stations: [],
      liveBoard: []
    },
    mutations: {
      increment (state, n=1) {
        state.count+=n
      },
      //
      // 取路線
      getLines(state) {
        getData('Line', false, '', json=>store.state.lines = json);
      },
      //
      // 依照線路取所有車站
      getStationsByLineID(state, id) {
        getData('StationOfLine', true, "&$filter=LineID eq '" + id + "'", json=>store.state.stations = json[0].Stations);
      },
      //
      // 依照車站取電子看板資料
      getLiveBoardByStationID(state, id) {
        getData('LiveBoard', true, "&$filter=StationID eq '" + id + "'", json=>store.state.liveBoard = json);
      }
    }
  });

  function getData(func, origin, params, cb) {
    // 目前只有Line讓他讀本地資料
    let path = origin ? 'http://ptx.transportdata.tw/MOTC/v2/Rail/TRA/' : 'data/';
    fetch(path + func + '?$format=json' + params)
    .then(data=>data.json())
    .then(json=>json.filter(item => (item.LineID != 'WL' && item.LineID != 'TL'))) //濾掉西部幹線跟縱貫線（因為這兩條線的LineID無法找到車站
    .then(json=>cb(json))
    .catch(function(data){
      alert(`資料傳輸錯誤，請重新整理`);
      //console.log(`${path}${params} 資料傳輸錯誤`);
    });
  }

  var app = new Vue({
    el: '.train_app',
    store,
    data: {
      selectedLine: localStorage.getItem('selectedLine') || 'WL-C', //預設西部幹線海線
      selectedStation: localStorage.getItem('selectedStation') || '1008' //預設台北車站
    },
    created() {
      store.commit('getLines');
      store.commit('getStationsByLineID', this.selectedLine);
      store.commit('getLiveBoardByStationID', this.selectedStation);

      // 五分鐘自動更新一次
      setInterval(()=>{
        store.commit('getLiveBoardByStationID', this.selectedStation);
      }, 300000);
    },
    methods: {
      getStationsByLineID: function() {
        localStorage.setItem('selectedLine', this.selectedLine);
        store.commit('getStationsByLineID', this.selectedLine);
      },
      getLiveBoardByStationID: function() {
        localStorage.setItem('selectedStation', this.selectedStation);
        store.commit('getLiveBoardByStationID', this.selectedStation);
      },
      getTrainTypeByID: function(id) {
        return trainType[id];
      },
      showTrainInfo: function(trainNo) {
        getData('GeneralTrainInfo', true, "&$filter=TrainNo eq '" + trainNo + "'", json=>{
          let data = json[0];
          alert(`${data.TrainNo} ${data.TrainTypeName.Zh_tw} ${data.Note.Zh_tw} 由 ${data.StartingStationName.Zh_tw} 開往 ${data.EndingStationName.Zh_tw}`)
        });
      }
    }
  });
});