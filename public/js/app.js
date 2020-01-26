let app = function() {
  
  return new Vue({
    el: '#app',
    data: DataLayer.DATA,
    stream: null,
    mounted: function() {
      setTimeout( () => DataLayer.init(), 0 )
    },
    filters: {

      track: function(s='') {
         /* tracknum is last element of prediction id */
         let tracknum = s.match( /-([0-9]+)$/ )[1] 
         return parseInt( tracknum ) == tracknum  ? tracknum : 'TBD'
      },

      tformat: function(s) {
        if(!s) return s
        let t = moment(s)
        return t < moment() ? 'DEPARTED' : t.format('HH:mm:ss')
      }

    }
  
  })

}()
