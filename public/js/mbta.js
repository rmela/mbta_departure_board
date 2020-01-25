const base="https://api-v3.mbta.com"


function buildUrl() {
  let endpoint = document.getElementById('endpoint').value
  console.log( document.getElementById('parameters') )
  let queryString = (document.getElementById('parameters').value || '').replace( /\s+/g, '&' )
  return queryString ? `${base}/${endpoint}?${queryString}` : `${base}/${endpoint}`
}

async function load( url ) {
  let res = await fetch( url )
  return await res.json()
}

async function onSubmit() {
  let result = await load( buildUrl() )
  let div = document.getElementById('result')
  div.innerHTML = JSON.stringify( result, null, 4 )
}

function onKeyUp( evt ) {
  if( evt.code != "Enter" )
    return;
  onSubmit() 
}

function init() {
  document.getElementById("form").addEventListener( "keyup", onKeyUp )
  document.getElementById("endpoint").addEventListener( "change", onSubmit )
}

window.addEventListener( 'load', init )


