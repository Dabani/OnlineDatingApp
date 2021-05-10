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