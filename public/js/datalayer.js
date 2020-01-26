const DataLayer = function() {
  
  const BASE = 'https://api-v3.mbta.com'

  let API_KEY = "" // Put your API key here, or pass apiKey in query string

  const DATA = {
    predictions: []
  }

  if( !API_KEY ) {
    let query = document.location.search
    query = query.slice(1) // remove leading '?'
    query = query.split('&').map( elt => elt.split('=') )
    query = Object.fromEntries( query )
    API_KEY = query.apiKey
    if( !API_KEY ) alert("Add API_KEY to app.js or pass apiKey query parameter to enable real-time updates")
  }

  let predictionsUrl = `${BASE}/predictions/?filter[stop]=South Station,North Station&sort=time`
  let streamUrl      = `${BASE}/predictions/?filter[stop]=South Station,North Station&filter[direction_id]=0&api_key=${API_KEY}`

  function flatten( prediction ) {

    let train = prediction.relationships.vehicle.data ?
                prediction.relationships.vehicle.data.id : ''

    // Some trains show as block_1234_something_something instead of 1234
    // Not sure what that means or whether to extract the train number from it

    if( train.startsWith('block_') ) { 
      train = train.split('_')[1]
    }

    return  {
      departure: prediction.attributes.departure_time,
      id: prediction.id,
      route: prediction.relationships.route.data.id,
      station: prediction.relationships.stop.data.id,
      status: prediction.attributes.status,
      train: train,
      trip: prediction.relationships.trip.data.id
    }
  } // flatten
  
  /*
   * Fetch initial batch of predictions to initialize board 
   */

  async function fetchPredictions() {
    let response = await fetch( predictionsUrl )
    let result = await response.json()
    DATA.predictions = result.data
      .map( flatten )
      //
      // Many predictions in initial list have null departures.
      // Seems like they're departures several hours in the future.
      // Could populate the time by fetching the schedule for a trip
      // and using it's departure time
      //
      // For now just filter them out.
      //
      .filter( elt => elt.departure ) 
  }

  /*
   * Start receiving updates via stream
   */

  startEventStream = () => {

    if(!API_KEY) return
 
    this.eventStream = new EventSource( streamUrl )
    this.eventStream.onerror = function(err) { console.log( err ) } 
    this.eventStream.onmessage = function(msg) { console.log('message', msg ) }
    this.eventStream.onclose = function(msg) { console.log('close', msg ) }
    this.eventStream.onopen = function(msg) { console.log('open', msg ) }
    this.eventStream.addEventListener('error', err => console.log( err ) )
    this.eventStream.addEventListener('update', this.onUpdate )

  }

  /*
   * Remove predictions where departure time is in the past
   */

  function prune() {
    let pruned = DATA.predictions.filter( p => p.departure > moment().format() )
    if( pruned.length == DATA.predictions.length ) return
    DATA.predictions = pruned
  }

  /*
   * Comparator for sorting predictions on departure time
   */
  function timeSortComparator(a, b ) {
     a = a.departure
     b = b.departure

     return a > b &&  1 ||
            a < b && -1 ||
            0
  }

  function onUpdate( msg ) {
console.log( 'UPDATE', moment().format() )
console.dir( msg.data )
    let data = flatten( JSON.parse( msg.data ) )

    // predictions identified by trip (?) since track number is part of id, but couldn't
    // train be sent to a different track?

    let prediction = DATA.predictions.find( p => p.trip == data.trip )
    if( !prediction ) {
console.log('Adding new prediction', data )
       DATA.predictions.push( data )
       DATA.predictions = DATA.predictions.sort( timeSortComparator )
    } else {
console.log('Updating existing prediction BEFORE', prediction )
       if( data.departure ) prediction.departure = data.departure
       if( data.train ) prediction.train = data.train
       if( data.status )  prediction.status = data.status
console.log('Updating existing prediction AFTER', prediction )
    }
    prune() // prune after updates
  }

  async function init() {
    await fetchPredictions()
    await startEventStream()
  }

  return {
    DATA: DATA,
    init: init
  }

}()
