Vue.component( 'departure-table', {
  props    : ['station', 'predictions'],
  computed: {
    filtered: function() {
      return this.predictions.filter( p => p.station == this.station )
    }
  },
  filters  : {

    tformat: function(s) {
      console.log('tformat', s )
      if(!s) return s
      let t = moment(s)
      return t < moment() ? 'DEPARTED' : t.format('HH:mm:ss')
    },

    track: function(s='') {
       console.log('track', s )
       /* tracknum is last element of prediction id */
       let tracknum = s.match( /-([0-9]+)$/ )[1] 
       return parseInt( tracknum ) == tracknum  ? tracknum : 'TBD'
    }

  },

  template : `

    <div>
      <table> 
        <caption>{{station}} Departures</caption>
        <thead>
           <th>route</th>
           <th>departure</th>
           <th>status</th>
           <th>train</th>
           <th>track</th>
           <th class="debug">id</th>
        </thead>
        <tbody v-for="prediction in filtered">
          <tr>
            <td>{{prediction.route}}</td>
            <td>{{prediction.departure | tformat }}</td>
            <td>{{prediction.status}}</td>
            <td>{{prediction.train}}</td>
            <td>{{prediction.id | track }}</td>
            <td class="debug"><div class='preformatted'>{{prediction}}</div></td>
          </tr>
        </tbody>
      </table>
      <div class="debug preformatted"> {{ filtered }} </div>
    </div>
  `
})

let app = function() {
  
  return new Vue({
    el: '#app',
    data: DataLayer.DATA,
    stream: null,
    mounted: function() {
      setTimeout( () => DataLayer.init(), 0 )
    }
  })

}()
