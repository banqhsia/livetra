$(function () {
  
  'use strict';
  
  Vue.component('select2', VueSelect2);
  
  const updatespeed = 60000;

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
      liveBoard: {
        clockwise: [], //順行
        counterclockwise: [] //逆行
      },
      timetable: [],
      stationsOfLine: []
    },
    mutations: {
      //
      // 取路線後取車站
      getLinesAndStations(state) {
        getData('Line', '', false, '', json=>{
          state.lines = json;
          store.commit('getStations');
        });
      },
      //
      // 取車站
      getStations(state) {
        getData('StationOfLine', '', false, '', json=>{
          let arr = [];

          json.forEach(item=>{
            let children = [];
            item.Stations.forEach(station=>{
              children.push({text: station.StationName, id: station.StationID})
            });

            arr.push({
              text: store.state.lines.filter(i=>i.LineID == item.LineID)[0]['LineNameZh'],
              children: children
            });
          });
          
          state.stationsOfLine = arr;
        }); //取全台車站 (local data)
      },
      //
      // 依照車站取電子看板資料
      getLiveBoardByStationID(state, station_id) {
        getData('LiveBoard', '/' + station_id, true, '', json=>state.liveBoard = json);
        buildLoadingCircle();
      },
      //
      // 依照車站取時刻表
      getDailyTimetable(state, station_id, date) {
        if (!date) {
          var d = new Date();
          date = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
        }
        getData('DailyTimetable', '/Station/' + station_id + '/' + date, true, '', json=>state.timetable = json);
      },
      clearTimetable(state) {
        state.timetable = [];
      }
    }
  });

  const app = new Vue({
    el: '.train_app',
    store,
    data: {
      selectedStation: localStorage.getItem('selectedStation') || '1008', //預設台北車站
      trainInfo: '',
      timetableDirection: 0
    },
    watch: {
      selectedStation: function() {
        this.getLiveBoardByStationID()
        store.commit('clearTimetable');
      }
    },
    created() {
      store.commit('getLinesAndStations'); //取線路名稱 (local data)
      store.commit('getLiveBoardByStationID', this.selectedStation);
      
      // 一分鐘自動更新一次
      setInterval(()=>{
        store.commit('getLiveBoardByStationID', this.selectedStation);
      }, updatespeed);
    },
    methods: {
      getLiveBoardByStationID: function() {
        localStorage.setItem('selectedStation', this.selectedStation);
        store.commit('getLiveBoardByStationID', this.selectedStation);
      },
      getTrainTypeByID: function(id) {
        return trainType[id];
      },
      showTrainInfo: function(trainNo) {
        getData('GeneralTrainInfo', '', true, "&$filter=TrainNo eq '" + trainNo + "'", json=>{
          let data = json[0];
          this.trainInfo = `${data.TrainNo} ${data.TrainTypeName.Zh_tw} ${data.Note.Zh_tw} 由 ${data.StartingStationName.Zh_tw} 開往 ${data.EndingStationName.Zh_tw}`;
          $('#train_info_modal').modal('show');
        });
      },
      getDailyTimetable: function() {
        store.commit('getDailyTimetable', this.selectedStation);
      }
    }
  });






  function getData(func, params = '', origin, filters, cb) {
    // origin == true 讀ptx pai資料 false 讀本地預先存好的資料（通常就是不太會有變動的部分）
    let path = origin ? 'http://ptx.transportdata.tw/MOTC/v2/Rail/TRA/' : 'data/';
    path += func + params + '?$format=json' + filters;

    fetch(path)
    .then(data=>data.json())
    .then(json=>{

      let now = new Date().getTime();

      switch (func) {
        case 'StationOfLine':
          json = json.filter(item => (item.LineID != 'WL' && item.LineID != 'TL')) //濾掉西部幹線跟縱貫線（因為這兩條線的LineID無法找到車站
          break;

        case 'DailyTimetable':
          // 濾掉已離站的車
          json = json.filter(item => {
            let dTime = new Date();
            dTime.setHours(item.DepartureTime.split(':')[0]);
            dTime.setMinutes(item.DepartureTime.split(':')[1]);
            return dTime.getTime() >= now;
          });
          break;

        case 'LiveBoard':
          // 濾掉已離站的車
          json = json.filter(item => {
            let dTime = new Date();
            dTime.setHours(item.ScheduledDepartureTime.split(':')[0]);
            dTime.setMinutes(item.ScheduledDepartureTime.split(':')[1]);
            return dTime.getTime() >= now && item.DelayTime == 0;
          });

          // 將資料分成順行逆行兩個部分
          let clockwise = json.filter(item=>item.Direction == 0);
          let counterclockwise = json.filter(item=>item.Direction == 1);
          json = {clockwise: clockwise, counterclockwise: counterclockwise};

          break;

        default:
          break;
      }
      return json;
    })
    .then(json=>cb(json))
    .catch(data => {
      alert(`資料傳輸錯誤，請重新整理`);
      //console.log(func, params, filters, path, origin, '資料傳輸錯誤', data);
    });
  }

  function buildLoadingCircle(){
    $(".my-progress-bar").circularProgress({
        line_width: 9,
        width: '90px',
        height: '90px',
        color: '#aaa',
        starting_position: 275.00,
        percent: 0,
        percentage: ''
    }).circularProgress('animate', 100, updatespeed);
  }







});




