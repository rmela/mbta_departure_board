/*
 * Data Access Layer for MBTA Departure Board project
 */
const DataLayer = function() {

  const BASE = 'https://api-v3.mbta.com'

  /*
   * API_KEY required for live prediction updates.
   * You can hard-code it here, or you can pass it as an "apiKey" parameter in a query string.
   *
   */

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
    if( !API_KEY ) {
       console.error('Missing API key - live stream updates will not work')
    }
  }

  let predictionsUrl = `${BASE}/predictions/?filter[stop]=South Station,North Station&sort=time`
  let streamUrl      = `${BASE}/predictions/?filter[stop]=South Station,North Station&filter[direction_id]=0&api_key=${API_KEY}`

  async function setDestinations( predictions ) {
    if( predictions.length == 0 ) return
    let trips = predictions.map( p => p.trip )
    trips = trips.join(',')
    trips = await fetch( `${BASE}/trips?filter[id]=${trips}` )
    trips = await trips.json()

    trips = Object.fromEntries( trips.data.map( t => [t.id, t] ) )
    
    for( let prediction of predictions ) {
      console.log( prediction.trip )
      let trip = trips[prediction.trip]
      if( !trip )
         continue
      prediction.destination = trip.attributes.headsign
      //prediction.track = trip.included.headsign
    }
    
    
    
  }
  /**
  * @flatten
  *
  * Extract information we want from prediction object, store in in a simpler structure that's easier
  * to work with
  */

  function flatten( prediction ) {

    let train = prediction.relationships.vehicle.data ?
                prediction.relationships.vehicle.data.id : ''

    // Some trains show as block_1234_something_something instead of 1234
    // Not sure what that means or whether to extract the train number from it

    if( train.startsWith('block_') ) {
      train = train.split('_')[1]
    }

    /* convert departure time from string to moment */

    let departure = prediction.attributes.departure_time
    if( departure ) {
      departure = moment(departure)
    }

    return  {
      departure: departure,
      arrival: prediction.attributes.arrival_time, // maybe this is populated and used to tell whether train is at platform?
      id: prediction.id,
      trip: prediction.relationships.trip.data.id,
      route: prediction.relationships.route.data.id,
      station: prediction.relationships.stop.data.id,
      direction: prediction.attributes.direction_id,
      status: prediction.attributes.status,
      train: train,
      boardingStatus: null,
      trip: prediction.relationships.trip.data.id
    }
  } // flatten

  function updateBoardingStatuses() {

    let now = moment()

    for( let prediction of DATA.predictions ) {

       if(!prediction.departure ) continue

       if( moment(now).add( -1, 'minutes' ) > prediction.departure ) {
         prediction.boardingStatus = 'DEPARTED'
         return
       }

       if( moment(now).add( 1, 'minutes' ) > prediction.departure ) {
         prediction.boardingStatus = 'All Aboard'
         return
       }

       if( moment(now).add( 10, 'minutes' ) > prediction.departure ) {
         prediction.boardingStatus = 'Boarding'
       }
       
    }
  }

  /**
   * @fetchPredictions
   *
   * Fetch batch of predictions to initialize board
   *
   * Invoked when application first loads.
   *
   */

  async function fetchPredictions() {

    let response = await fetch( predictionsUrl )
    let result = await response.json()

    result = result.data
      .map( flatten )
      .filter( elt => elt.departure )

    await setDestinations( result )

    DATA.predictions = result
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


  /**
  * @onUpdate
  *
  * Invoked when new predictions arrive on live stream.
  *
  * If matching prediction found in list, update it's values
  *
  * If no match found, then prediction is new.  Add it to the list.
  *
  */

  async function onUpdate( msg ) {

    console.log( 'UPDATE', moment().format() )
    console.dir( msg.data )

    let data = flatten( JSON.parse( msg.data ) )

    let prediction = DATA.predictions.find( p => p.id == data.id )

    if( !prediction ) {

       console.log('Adding new prediction', data )
       await setDestinations( [data] )
       DATA.predictions.push( data )
       DATA.predictions = DATA.predictions.sort( timeSortComparator )

    } else {

       console.log('Updating existing prediction BEFORE', prediction )
       if( data.departure ) prediction.departure = data.departure
       if( data.train ) prediction.train = data.train
       if( data.status )  prediction.status = data.status
       console.log('Updating existing prediction AFTER', prediction )

    }
  }
  /**
   * @startEventStream
   *
   * Start receiving preduction updates via event stream
   *
   */

  startEventStream = () => {

    if(!API_KEY) return

    this.eventStream = new EventSource( streamUrl )

    this.eventStream.onclose = function(msg) { console.log('close', msg ) }
    this.eventStream.onopen = function(msg) { console.log('open', msg ) }

    this.eventStream.addEventListener('error', function(err) {
      console.error( err )
    })

    this.eventStream.addEventListener('update', function(msg) {
      console.log( 'update event' ) 
      onUpdate(msg)
    })

  }

  /**
   *
   * @prune
   *
   * Remove predictions for departed trains (departure time is in the past)
   *
   */

  function prune() {

    let cutoff = moment()
    cutoff.add( -2, 'minutes' )

    let pruned = DATA.predictions.filter( p => { // Filter for non-departed trains

       // Assumes departures in list are never null.  Not sure that's a safe assumption.
 
       let t = moment(p.departure);
       return t  > cutoff

    })

    if( pruned.length == DATA.predictions.length ) { // No departed trains. Nothing to prune.
      return
    }

    console.log( `pruned ${DATA.predictions.length - pruned.length} items` )
    DATA.predictions = pruned
  }


  /*
   * @timeSortComparator 
   *
   * Comparator for sorting predictions on departure time
   *
   */

  function timeSortComparator(a, b ) {
     a = a.departure
     b = b.departure

     return a > b &&  1 ||
            a < b && -1 ||
            0
  }

  /**
  *
  * @init
  *
  * Application will call this function when it's ready to start using data.
  *
  */

  async function init() {
    await fetchPredictions()
    await startEventStream()
  }

  return {
    DATA: DATA,
    init: init,
    prune: prune,
    updateBoardingStatuses: updateBoardingStatuses
  }

}()
