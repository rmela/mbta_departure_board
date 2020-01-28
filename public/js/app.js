Vue.component( 'departure-table', {
  props    : ['station', 'predictions'],
  filters  : {

    tformat: function(s) {
      if(!s) return s
      let t = moment(s)
      return t < moment() ? 'DEPARTED' : t.format('HH:mm:ss')
    }

  },

  template : `

    <div>
      <table> 
        <caption>{{station}} Departures</caption>
        <thead>
           <th>destination</th>
           <th>departure</th>
           <th>status</th>
           <th>boarding status</th>
           <th>train</th>
           <th>track</th>
           <th class="debug">id</th>
        </thead>
        <tbody v-for="prediction in predictions">
          <tr v-if="prediction.station == station">
            <td>{{prediction.destination}}</td>
            <td>{{prediction.departure | tformat }}</td>
            <td>{{prediction.status}}</td>
            <td>{{prediction.boardingStatus}}</td>
            <td>{{prediction.train}}</td>
            <td>?</td>
            <td class="debug"><div class='preformatted'>{{prediction}}</div></td>
          </tr>
        </tbody>
      </table>
    </div>
  `
})

function updates() {
  DataLayer.prune()
  DataLayer.updateBoardingStatuses()
}

let app = function() {
  
  return new Vue({
    el: '#app',
    data: DataLayer.DATA,
    stream: null,
    mounted: function() {
      setTimeout( () => DataLayer.init(), 0 )
      this.interval = setInterval( updates, 10 )
    },
    beforeDestroy: function() {
      if( !this.interval ) return
      clearInterval( this.interval )
      this.interval = null
    }
  })

}()
