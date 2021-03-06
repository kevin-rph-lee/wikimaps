$(() => {

  const markersArray = [];
  const infoWindowArray = [];
  const polylinesArray = [];
  let clickListener;
  let markerClick;
  let infoWindow;
  //Setting the current step number & ID
  let currentStep = {
    id: Number(stepIDs[0].id),
    number: 1
  }

  //Adds markers, lines, and step descriptions to the page
  addMarkersLinesAndDescriptions = (stepID) => {

    //Adding polylines
    for (let y = 0; y < polylines.length; y ++) {
      if (polylines[y].step_id === stepID) {
        addPolyline(polylines[y]);
      }
    }

    //Adding Markers & event listeners
    for (let i = 0; i < markers.length; i ++) {
      if (markers[i].step_id === stepID) {
        addMarker(markers[i]);
      }
    }

    //Adding step descriptions
    for (let x = 0; x < stepIDs.length; x ++) {
      if (Number(stepID) === Number(stepIDs[x].id)) {
        $('.plan-description').html(stepIDs[x].description);
      }
    }
  }

  //Moving to next step within pagination
  $('#step-forward').click(function (e) {
    for(let i = 0; i < stepIDs.length; i++){
      if(currentStep.id === Number(stepIDs[i].id)){
        //Checking to see if you've hit the end of the list of steps
        if(stepIDs[i +1] === undefined){
          return;
        } else {

          //moving the pagination active marker
          $('.active').next().addClass('active');
          $( '.active' ).first().removeClass( 'active' );

          clearMarkersAndPolylines();

          addMarkersLinesAndDescriptions(Number(stepIDs[i + 1].id))
          currentStep.number++
          currentStep.id = Number(stepIDs[i + 1].id);
          return;
        }

      }
    }
  })

  //Moving to previous step within pagination
  $('#step-backwards').click(function (e) {
    for (let i = 0; i < stepIDs.length; i++) {
      if (currentStep.id === Number(stepIDs[i].id)) {

        //Checking to see if you've hit the end of the list of steps
        if (stepIDs[i-1] === undefined) {
          return;
        } else {

          //moving the pagination active marker
          $('.active').prev().addClass('active');
          $( '.active' ).last().removeClass('active');

          clearMarkersAndPolylines();

          addMarkersLinesAndDescriptions(Number(stepIDs[i - 1].id))
          currentStep.number--
          currentStep.id = Number(stepIDs[i - 1].id);

          return;
        }
      }
    }
  })

  //Clicking on a pagination button to skip to a step
  $('.step-to').click(function () {

    //Removeing the active class and swapping it with the active
    $('.active').removeClass('active')
    $(this).addClass('active');

    //Updating the current step and step id
    currentStep.number = $(this).data('step-number');
    currentStep.id = $(this).data('step-id');

    //Clearing polylines and markers along with re-adding the new ones
    clearMarkersAndPolylines();
    addMarkersLinesAndDescriptions(Number($(this).data('step-id')))
  })

  /**
   * Initializes the plan
   * @param  {array} locations An array of locations to have markers added to the plan
   */
  initPlan = (markers, polylines, stepID, mapType) => {

    //Initializing the map
    plan = new google.maps.Map(document.getElementById('plan'), {
      center: {lat: -55.60427598849055, lng: -64.92253974426148},
      zoom: 5,
      streetViewControl: false,
      mapTypeControlOptions: {
        mapTypeIds: ['OW']
      }
    });

    //Overlaying the tiles of the OW map
    let OWMapType = new google.maps.ImageMapType({
      getTileUrl: function(coord, zoom) {
          let normalizedCoord = getNormalizedCoord(coord, zoom);
          if (!normalizedCoord) {
            return null;
          }
          let bound = Math.pow(2, zoom);
          return mapURL.url + zoom + '/' + normalizedCoord.x + '/' +
              (bound - normalizedCoord.y - 1) + '.png';
      },
      tileSize: new google.maps.Size(256, 256),
      maxZoom: 6,
      minZoom: 4
    });

    let allowedBounds;
    //Control maps have different bounds
    if (mapType !== 'Control') {
      //Defining out far out a user is able to pan - SW corner first, NE corner second
      allowedBounds = new google.maps.LatLngBounds(
           new google.maps.LatLng(-76.53872912052131, -122.52994923110276),
           new google.maps.LatLng(-12.670418295569519, -12.480669814400471));
    } else {
      //Defining out far out a user is able to pan - SW corner first, NE corner second
      allowedBounds = new google.maps.LatLngBounds(
           new google.maps.LatLng(-76.64062074438048, -121.80094949737884),
           new google.maps.LatLng(-13.375349018704462, 97.22468850116775));

    }

    //Listnes to drag event, if it goes out of bounds, auto pan the user back within bounds
    google.maps.event.addListener(plan, 'dragend', function() {
       if (allowedBounds.contains(plan.getCenter())) return;

       // Out of bounds - Move the map back within the bounds

       let c = plan.getCenter(),
           x = c.lng(),
           y = c.lat(),
           maxX = allowedBounds.getNorthEast().lng(),
           maxY = allowedBounds.getNorthEast().lat(),
           minX = allowedBounds.getSouthWest().lng(),
           minY = allowedBounds.getSouthWest().lat();

       if (x < minX) x = minX;
       if (x > maxX) x = maxX;
       if (y < minY) y = minY;
       if (y > maxY) y = maxY;

       plan.setCenter(new google.maps.LatLng(y, x));
    })

    plan.mapTypes.set('OW', OWMapType);
    plan.setMapTypeId('OW');

    //NOTE: How to auto zoom around all markers
    // for(let x = 0; x < markersArray.length; x ++){
    //   bounds.extend(markersArray[x].getPosition())
    // }
    // plan.fitBounds(bounds);

    addMarkersLinesAndDescriptions(currentStep.id);
  }

  /**
   * Gets normalized coordinates for the map. Used only when the map is initialized
   */
  getNormalizedCoord = (coord, zoom) => {
    let y = coord.y;
    let x = coord.x;

    // tile range in one direction range is dependent on zoom level
    // 0 = 1 tile, 1 = 2 tiles, 2 = 4 tiles, 3 = 8 tiles, etc
    let tileRange = 1 << zoom;

    // don't repeat across y-axis (vertically)
    if (y < 0 || y >= tileRange) {
      return null;
    }

    if (x < 0 || x >= tileRange) {
      x = (x % tileRange + tileRange) % tileRange;
    }

    return {x: x, y: y};
  }

  //Adds the polylines of a step to the map
  addPolyline = (polylineToAdd) => {
    let polylineCoordinates = []
    for(let y = 0; y < polylineToAdd.coordinates.coordinatesArray.length; y ++){
      let newPolyline = new google.maps.Polyline({
        path: polylineToAdd.coordinates.coordinatesArray,
        geodesic: true,
        strokeColor: '#FF0000',
        strokeOpacity: 1.0,
        strokeWeight: 2
      });
      polylinesArray.push(newPolyline)
      newPolyline.setMap(plan);
    }
  }

  /**
   * Adds an individual marker to the map
   * @param  {google maps loc obj} location A google maps lat/long obj
   * @param  {string} title    Title of the marker
   */
  // addMarker = (position, title, icon_file_location, description, id, email, image) => {
  addMarker = (markerToAdd) => {

    let marker = new google.maps.Marker({
      position: markerToAdd.position,
      map: plan,
      title: markerToAdd.title,
      icon: markerToAdd.icon_file_location
    });



    let infoWindow;
    //If owner, has the ability to delete the marker
    if (isOwner === true) {
      //Checking if marker has an image OR video OR nothing
      if (markerToAdd.image === true) {
        //Adding info window
        if (infoWindow === undefined) {
          infoWindow = new google.maps.InfoWindow({content: '<h3>'+ markerToAdd.title + `</h3><img class='tool-tip-image' src='/./../images/${markerToAdd.id}.jpg'><p>` + markerToAdd.description + `</p><button type='button' class='btn btn-warning' id='delete-marker-button' onClick='deleteMarker(${markerToAdd.id})'>Delete</button>
<div id='info-window-alert'></div>`});
        } else {
          //If another info window is already opened, closing
          infoWindow.close();
          infoWindow = new google.maps.InfoWindow({content: '<h3>'+ markerToAdd.title + `</h3><img class='tool-tip-image' src='/./../images/${markerToAdd.id}.jpg'><p>` + markerToAdd.description + `</p><button type='button' class='btn btn-warning' id='delete-marker-button' onClick='deleteMarker(${markerToAdd.id})'>Delete</button>
<div id='info-window-alert'></div>`});
        }
      } else if (markerToAdd.video_URL !== null) {

        //Adding info window
        if(infoWindow === undefined) {
          infoWindow = new google.maps.InfoWindow({content: '<h3>'+ markerToAdd.title + `</h3><iframe width="420" height="315" src="https://www.youtube.com/embed/${markerToAdd.video_URL}"></iframe><p>` + markerToAdd.description + `</p><button type='button' class='btn btn-warning' id='delete-marker-button' onClick='deleteMarker(${markerToAdd.id})'>Delete</button>
<div id='info-window-alert'></div>`});
        } else {
          //If another info window is already opened, closing
          infoWindow.close();
          infoWindow = new google.maps.InfoWindow({content: '<h3>'+ markerToAdd.title + `</h3><iframe width="420" height="315" src="https://www.youtube.com/embed/${markerToAdd.video_URL}"></iframe><p>` + markerToAdd.description + `</p><button type='button' class='btn btn-warning' id='delete-marker-button' onClick='deleteMarker(${markerToAdd.id})'>Delete</button>
<div id='info-window-alert'></div>`});
        }
      } else {
        //Adding info window
        if(infoWindow === undefined) {
          infoWindow = new google.maps.InfoWindow({content: '<h3>'+ markerToAdd.title + `</h3><p>` + markerToAdd.description + `</p><button type='button' class='btn btn-warning' id='delete-marker-button' onClick='deleteMarker(${markerToAdd.id})'>Delete</button>
<div id='info-window-alert'></div>`});
        } else {
          //If another info window is already opened, closing
          infoWindow.close();
          infoWindow = new google.maps.InfoWindow({content: '<h3>'+ markerToAdd.title + `</h3><p>` + markerToAdd.description + `</p><button type='button' class='btn btn-warning' id='delete-marker-button' onClick='deleteMarker(${markerToAdd.id})'>Delete</button>
<div id='info-window-alert'></div>`});
        }
      }
    } else {
      //None owners do not see delete options
      if (markerToAdd.image === true) {


        if (infoWindow === undefined) {
          infoWindow = new google.maps.InfoWindow({content: '<h3>'+ markerToAdd.title + `</h3><img class='tool-tip-image' src='/./../images/${markerToAdd.id}.jpg'><p>` + markerToAdd.description + `</p>`});
        } else {
          infoWindow.close();
          infoWindow = new google.maps.InfoWindow({content: '<h3>'+ markerToAdd.title + `</h3><img class='tool-tip-image' src='/./../images/${markerToAdd.id}.jpg'><p>` + markerToAdd.description + `</p>`});

        }
      } else if (markerToAdd.video_URL !== null) {
        if (infoWindow === undefined) {
          infoWindow = new google.maps.InfoWindow({content: '<h3>'+ markerToAdd.title + `</h3><iframe width="420" height="315" src="https://www.youtube.com/embed/${markerToAdd.video_URL}"></iframe><p>` + markerToAdd.description + `</p>`});
        } else {

          infoWindow.close();
          infoWindow = new google.maps.InfoWindow({content: '<h3>'+ markerToAdd.title + `</h3><iframe width="420" height="315" src="https://www.youtube.com/embed/${markerToAdd.video_URL}"></iframe><p>` + markerToAdd.description + `</p>`});
        }
      } else {
        if (infoWindow === undefined) {
          infoWindow = new google.maps.InfoWindow({content: '<h3>'+ markerToAdd.title + '</h3><p>' + markerToAdd.description + `</p>`});
        } else {
          infoWindow.close();
          infoWindow = new google.maps.InfoWindow({content: '<h3>'+ markerToAdd.title + `</h3><p>` + markerToAdd.description + `</p>`});
        }
      }
    }

    //Adding all of the info windows
    infoWindowArray.push(infoWindow);

    //Adding click listener to the markers to open the info windows
    google.maps.event.addListener(marker, 'click', function() {
        closeInfoWindows();
        infoWindow.open(plan, marker);
    });

    //Pushing the marker to the array
    markersArray.push(marker);

  }

  //Depending on what radio button is selected within the new marker modal, the marker type dropdown is populated.
  $('#teammates[type="radio"]').click(function(){
    //Clearing the modal of it's current contents
    $('#marker-type-select').children().remove();
    for(let i = 0; i < markerTypes.length; i ++){
      if(markerTypes[i].misc_icon !== true && markerTypes[i].teammate_icon === true){
        $('#marker-type-select').append(`<option data-id= ${markerTypes[i].id}>${markerTypes[i].title}</option>`)
      }
    }
  });
  //Depending on what radio button is selected within the new marker modal, the marker type dropdown is populated.
  $('#enemy[type="radio"]').click(function(){
    //Clearing the modal of it's current contents
    $('#marker-type-select').children().remove();
    for(let i = 0; i < markerTypes.length; i ++){
      if(markerTypes[i].misc_icon !== true && markerTypes[i].teammate_icon !== true){
        $('#marker-type-select').append(`<option data-id= ${markerTypes[i].id}>${markerTypes[i].title}</option>`)
      }
    }
  });
  //Depending on what radio button is selected within the new marker modal, the marker type dropdown is populated.
  $('#other[type="radio"]').click(function(){
    //Clearing the modal of it's current contents
    $('#marker-type-select').children().remove();
    for(let i = 0; i < markerTypes.length; i ++){
      if(markerTypes[i].misc_icon === true){
        $('#marker-type-select').append(`<option data-id= ${markerTypes[i].id}>${markerTypes[i].title}</option>`)
      }
    }
  });


  //Depending on what radio button is selected within the new marker modal, the marker type dropdown is populated.
  $('#image[type="radio"]').click(function(){

    //Clearing the modal of it's current contents
    $('#add-image-video-container').children().remove();
    $('#add-image-video-container').append(`
            <label for="marker-image">Upload Image (optional) - JPG only</label>
            <input type="file" class="form-control" id="marker-image-upload" name="userFile">
      `)

  });

  //Depending on what radio button is selected within the new marker modal, the marker type dropdown is populated.
  $('#video[type="radio"]').click(function(){

    //Clearing the modal of it's current contents
    $('#add-image-video-container').children().remove();
    $('#add-image-video-container').append(`
            <label for="marker-video">Embed Youtube Video</label>
            <input type="text" class="form-control" id="marker-video-upload">
      `)
  });


  //Submitting a new marker
  $('#new-marker-form').submit(function (e) {
    e.preventDefault();
    let formData = new FormData(this);

    //Checking if a new marker has been placed on the map
    if(markerClick === null || markerClick === undefined || markerClick.getMap() === null){
      $('#alert').append(`
      <div class='alert alert-warning alert-dismissible fade show' role='alert'>
      <strong>OOPS!</strong> No marker to add!
      <button type='button' class='close' data-dismiss='alert' aria-label='Close'>
        <span aria-hidden='true'>&times;</span>
      </button>
      </div>
      `)
      $('.alert').delay(3000).fadeOut('slow');
      return;
    }

    //Checking to see if all form inputs have been filed out (except image)
    if( $('#marker-name').val().length === 0 || $('#marker-description').val().length === 0 || $('#marker-type-select').find(':selected').data('id') === undefined){
      $('#alert').append(`
      <div class='alert alert-warning alert-dismissible fade show' role='alert'>
      <strong>OOPS!</strong> Missing new marker title, descrition, or marker type
      <button type='button' class='close' data-dismiss='alert' aria-label='Close'>
        <span aria-hidden='true'>&times;</span>
      </button>
      </div>
      `)
      $('.alert').delay(3000).fadeOut('slow');
      return;

    }

    let newMarkerData;

    //Checking to see if new marker data has a video embedded or not
    if($('#marker-video-upload').length !== 0 && $('#marker-video-upload').val().length !== 0 ){
      newMarkerData = {
        markerName: $('#marker-name').val(),
        markerDescription: $('#marker-description').val(),
        position: {lat:markerClick.getPosition().lat(), lng:markerClick.getPosition().lng()},
        markerTypeID: $('#marker-type-select').find(':selected').data('id'),
        videoURL: $('#marker-video-upload').val(),
        planID: planID
      }
    } else {
      newMarkerData = {
        markerName: $('#marker-name').val(),
        markerDescription: $('#marker-description').val(),
        position: {lat:markerClick.getPosition().lat(), lng:markerClick.getPosition().lng()},
        markerTypeID: $('#marker-type-select').find(':selected').data('id'),
        planID: planID
      }
    }

    //Uploading marker data
    $.ajax({
      url: '/markers/step/' + currentStep.id + '/new',
      data: newMarkerData,
      method: 'POST'
    }).done((id) => {

      //checking if there is a picture to upload
      if($('#marker-image-upload').length === 0 || document.getElementById('marker-image-upload').files.length === 0){
        location.reload();
      } else {
        //Uploading image
        $.ajax({
            type: 'POST',
            url: '/markers/' + id + '/image',
            data: formData,
            processData: false,
            contentType: false
        }).done(() => {
          location.reload();
        }).catch((err) =>{
          $('#alert').append(`
          <div class='alert alert-warning alert-dismissible fade show' role='alert'>
          <strong>OOPS!</strong> Invalid File type!
          <button type='button' class='close' data-dismiss='alert' aria-label='Close'>
            <span aria-hidden='true'>&times;</span>
          </button>
          </div>
          `)
          $('.alert').delay(3000).fadeOut('slow');
        });
      }
    }).catch((err) => {
        $('#alert').append(`
        <div class='alert alert-warning alert-dismissible fade show' role='alert'>
        <strong>OOPS!</strong> ${err.responsetext}
        <button type='button' class='close' data-dismiss='alert' aria-label='Close'>
          <span aria-hidden='true'>&times;</span>
        </button>
        </div>
        `)
        $('.alert').delay(3000).fadeOut('slow');
    });

  });

  /**
   * Closes the info windows
   */
  closeInfoWindows = () => {
      for (let x = 0; x < infoWindowArray.length; x++) {
          infoWindowArray[x].close();
      }
  }

  /**
   * Deletes a marker
   * @param  {int} id ID of marker to be deleted
   */
  deleteMarker = (id) => {
    //Preventing from deleting all markers off a map


    let confirmBox = confirm('Are you sure?!');
    if (confirmBox == true) {
      $.ajax({
        url: '/markers/delete/' + id,
        data: {
          planID: planID
        },
        method: 'POST'
      }).done(() => {
        location.reload();

      }).catch((err) => {
        alert('Some kind of error happened!');
      });
    }

  }

  /**
   * Clears all polylines and markers currently active on the plan
   */
  clearMarkersAndPolylines = () =>{

    for (let i = 0; i < markersArray.length; i ++) {
      // markersArray[i].removeListener();
      // markersArray[i].removeEventListener('click');
      markersArray[i].setMap(null);
    }
    for (let y = 0; y < polylinesArray.length; y ++) {
      // markersArray[i].removeListener();
      // markersArray[i].removeEventListener('click');
      polylinesArray[y].setMap(null);
    }
    markersArray.length = 0;
    infoWindowArray.length = 0;
    polylinesArray.length = 0;

  }

  //Places 'add marker' temp marker
  let toggleAddMarker = (event) => {
    if(markerClick === undefined || markerClick.getMap() === null){
      markerClick = new google.maps.Marker({
        position: event.latLng,
        map: plan,
        icon:  'https://www.google.com/mapfiles/arrow.png'
      });
    } else {
      markerClick.setPosition(event.latLng);
    }
  }



  if(isOwner) {
    //Enables the place temp marker listeniner
    $('#toggle-add-marker').click(function() {
      if($('#toggle-add-marker').hasClass('btn-primary')) {
        $('#toggle-add-marker').removeClass('btn-primary');
        $('#toggle-add-marker').addClass('btn-info');
        clickListener = plan.addListener('click', toggleAddMarker);

      }
     else{
      //Wipes the temp marker
        $('#toggle-add-marker').removeClass('btn-info');
        $('#toggle-add-marker').addClass('btn-primary');
        google.maps.event.removeListener(clickListener);
        markerClick.setMap(null);

      }

    });

  }

  //Opens the modal for new marker
  $('#new-marker-button').click(function() {
    $('#new-marker-modal').css('display', 'block');
  });

  //Opens the new step button modal
  $('#new-step-button').click(function() {
      $('#new-step-modal').css('display', 'block');
  });

  //Closes the new step modal
  $('.close-new-step-button').click(function() {
      $('#new-step-modal').css('display', 'none');
  });

  //Closes the new marker modal
  $('.close-new-marker-button').click(function() {
    $('#new-marker-modal').css('display', 'none');
  });

  //Submitting a new step
  $('#new-step-form').submit(function (e) {
    e.preventDefault();

    //Checking to see if all form inputs have been filed out (except image)
    if( $('#step-description').val().length === 0){
      $('#alert').append(`
      <div class='alert alert-warning alert-dismissible fade show' role='alert'>
      <strong>OOPS!</strong> Missing step description!
      <button type='button' class='close' data-dismiss='alert' aria-label='Close'>
        <span aria-hidden='true'>&times;</span>
      </button>
      </div>
      `)
      $('.alert').delay(3000).fadeOut('slow');
      return;
    }

    //Ajax call to create the new step
    $.ajax({
      url: '/steps/plan/' + planID + '/new/',
      method: 'POST',
      data: {
        description: $('#step-description').val()
      }
    }).done(() => {
      location.reload();
    }).catch((err) => {
      alert('Some kind of error happened!');
    });

  });

  //Enables tooltip
  $('[data-tooltip="tooltip"]').tooltip();

  //Deletes the current step
  $( '#delete-step-button' ).click(function() {
    //A plan must have at least 1 step
    if(stepIDs.length === 1){
      $('#delete-step-alert').append(`
      <div class='alert alert-warning alert-dismissible fade show' role='alert'>
      A plan must have at least one step!
      <button type='button' class='close' data-dismiss='alert' aria-label='Close'>
        <span aria-hidden='true'>&times;</span>
      </button>
      </div>
      `)
      $('.alert').delay(3000).fadeOut('slow');
      return;
    }

    let confirmBox = confirm('Are you sure?');
    //Having them confirm the delete and sending AJAX request
    if(confirmBox){
      $.ajax({
        url: '/steps/delete/' + currentStep.id,
        data: {planID: planID},
        method: 'POST'
      }).done(() => {
        location.reload();
      }).catch((err) => {
        alert('Some kind of error happened!');
      });
    }
  });

  initPlan(markers, polylines, currentStep.id, mapType);


});
