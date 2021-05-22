$(function(){
  $('.upload-btn').on('click', function(){
    $('#upload-input').click();
  });
  $('#upload-input').on('change', function(){
    var uploadInput = $('#upload-input');
    if (uploadInput.val() != '') {
      var formData = new FormData();
      formData.append('upload', uploadInput[0].files[0]);

      $.ajax({
        url: '/uploadFile',
        type: 'POST',
        data: formData,
        processData: false,
        contentType: false,
        success: function(){
          uploadInput.val('');
        }
      });
    }
  });
});

// Make chatRoom autoscrollable
$(function(){
  $('#messages').animate({scrollTop:1000000}, 800);
});

// Tooltips
var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'))
var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
  return new bootstrap.Tooltip(tooltipTriggerEl)
})

// Smile notification icon
$(function(){
  setInterval(function(){
    $('.smile').attr('style','color:red');
  },10);
  setInterval(function(){
    $('.smile').attr('style', 'color:white');
  },30);
});

// Message notification icon
$(function () {
  setInterval(function () {
    $('.letter').attr('style', 'color:green');
  }, 10);
  setInterval(function () {
    $('.letter').attr('style', 'color:white');
  }, 30);
});

$(function () {
  setInterval(function () {
    $('.newsmile').attr('style', 'color:white');
  }, 10);
  setInterval(function () {
    $('.newsmile').attr('style', 'color:red');
  }, 30);
})

// Friend notification icon
$(function () {
  setInterval(function () {
    $('.friend').attr('style', 'color:orange');
  }, 20);
  setInterval(function () {
    $('.friend').attr('style', 'color:white');
  }, 50);
});
