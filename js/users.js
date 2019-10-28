let currentUser;

function userSelect(event) {
  currentUser = event.currentTarget.id;
  localStorage.setItem('currentUser', JSON.stringify(event.currentTarget.id));
  $('#users').modal('hide');
}

function initUsers() {
  $('.user-select').click(userSelect);
  
  currentUser = JSON.parse(localStorage.getItem('currentUser'));

  if (!currentUser) {
    selectUser();
  }
}

function selectUser() {
  $('#users').modal();
}
