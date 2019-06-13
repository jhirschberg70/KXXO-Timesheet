const DEFAULT_TIME_DUE = '8:00 AM';
const DEFAULT_HOURS_PER_DAY = 8.00;
const DEFAULT_HOUR_STEP = 0.0833;
const DEFAULT_TIME_STEP = 5;
const STORAGE_DLM = '\u0000';
const HOURS_STORAGE_DLM = '\u0001';
const STATUS_TIMEOUT = 5000;
const UNDONE_TIMEOUT = 1250;

let currentDate;
let dueDate;
let undoData;
let name;
let hoursPerDay;
let hourStep;

function Record(holiday, activities, vacation, sick, hours, regular, talent, hoursWorked) {
  this.holiday = holiday;
  this.activities = activities;
  this.vacation = vacation;
  this.sick = sick;
  this.hours = hours;
  this.regular = regular;
  this.talent = talent; // Total talent hours, regardless of rate
  this.hoursWorked = hoursWorked;  // Ranges of times worked
  this.total = regular + holiday + vacation + sick + talent;
}

function Hours(hoursType, arrive, leave, rate) {
  this.hoursType = hoursType;
  this.arrive = arrive;
  this.leave = leave;
  this.rate = rate;
}

function Settings(name, hoursPerDay) {
  this.name = name;
  this.hoursPerDay = hoursPerDay;
}

function Undo(type, record) {
  this.type = type;
  this.record = record;
}

function editCheck(event) {
  let target = event.target.id;
  let targetSelector = '#' + target;
  let instance = target.match(/\d+$/) ? target.match(/\d+$/)[0] : null;

  // Default to saving and deleting record being disabled
  $('#edit-save').prop('disabled', true).addClass('btn-disabled');
  $('#edit-delete').prop('disabled', true).addClass('btn-disabled');

  if (target === 'edit-holiday') {
    if ($(this).is(':checked')) {
      $('.non-holiday').prop('disabled', true);
      $('.btn-hours').addClass('btn-disabled');
      $('#holiday-status').html('Yes');
      $('#edit-save').prop('disabled', false).removeClass('btn-disabled');
      $('#edit-delete').prop('disabled', false).removeClass('btn-disabled');
      if ($('.times').length) { removeTimes(); }
    }
    else {
      $('.non-holiday').prop('disabled', false);
      $('#add').removeClass('btn-disabled');
      $('#remove').prop('disabled', true);
      $('#holiday-status').html('No');
    }
  }
  else if (target === 'edit-delete') {
    deleteRecord();
  }
  else {
    let vacationValid = (($('#edit-vacation').val()) != '0');
    let sickValid =  (($('#edit-sick').val()) != '0');
    
    if (target === 'add') {
      addTimes();
    }
    else if (target === 'remove') {
      removeTimes(':last');
    }
    else if (target.match(/^ht-\d+$/)) {
      if ($(targetSelector).is(':checked')) {
	$('#s-' + instance).html('Talent');
	$('#r-' + instance).prop('disabled', false);
      }
      else {
	$('#s-' + instance).html('Regular');
	$('#r-' + instance).prop('disabled', true);
      }
    }
    // If rate is being changed, check to see that change is valid
    // If it is, update input
    else if (target.match(/^r-\d+$/)) {
      let rate = $('#' + target).val();
      let start = ($('#' + target).prop('selectionStart'));
      let end = ($('#' + target).prop('selectionEnd'));
      
      // If pasting, rate value hasn't been updated yet.  Get current value
      // paste in value and check against valid currency format.  If valid
      // update input.  If typing, rate value will already be updated.  Check
      // against valid currency format.  If not valid, remove character that
      // was typed in.
      if (event.type === 'paste') {
	let paste = event.originalEvent.clipboardData.getData('text');
	let length = paste.length;
	let cursor = end + (length - (end - start));
	rate = rate.substring(0, (start)) + paste + rate.substring(end);
	
	if (rate.match(/^(0*[1-9]\d*|0*[1-9]\d*\.\d{0,2})$/)) {
	  $('#' + target).val(rate);
	  $('#' + target)[0].setSelectionRange(cursor, cursor);
	}
      }
      else {
	if (!(rate.match(/^(0*[1-9]\d*|0*[1-9]\d*\.\d{0,2})$/))) {
	  rate = rate.substring(0, (start - 1)) + rate.substring(start);
	  $('#' + target).val(rate);
	  $('#' + target)[0].setSelectionRange(end - 1, end - 1);
	}
      }
    }
    
    if ((hoursValid()) ||
	(vacationValid && !hoursValid()) ||
	(sickValid && !hoursValid())) {
      $('#edit-save').prop('disabled', false).removeClass('btn-disabled');
      $('#edit-delete').prop('disabled', false).removeClass('btn-disabled');
      $('#edit-holiday').prop('disabled', true);
    }
    else {
      $('#edit-holiday').prop('disabled', false);
    }
  }
}

function hoursValid() {
  // Checks that times don't overlap and that hours marked as Talent have a valid rate set
  let numTimes = $('.times').length;
  let hoursValid = numTimes;
  
  // Check that all times are valid.  First check that all arrive times are
  // < leave times.  Then check that return time is > previous leave time.
  for (let time = 0; time < numTimes; time++) {
    let arrive = moment(currentDate + ' ' + ($('#a-' + time).datetimepicker('date').format('HH:mm')));
    let leave  = moment(currentDate + ' ' + ($('#l-' + time).datetimepicker('date').format('HH:mm')));
    let prevLeave = moment('1970-01-01 00:00'); // Beginning of time
    let hoursType = $('#ht-' + time).val();
    let rate = $('#r-' + time).val();

    if (time > 0) {
      prevLeave = moment(currentDate + ' ' + ($('#l-' + (time - 1)).datetimepicker('date').format('HH:mm')));
    }

    $('#times-' + time).find('.time').removeClass('invalid');

    // If leave is the same as or before arrive, times are invalid
    if (leave.isSameOrBefore(arrive)) {
      $('#a-time-' + time).addClass('invalid');
      $('#l-time-' + time).addClass('invalid');
      hoursValid = false;
    }

    // If arrive is the same as or before previous leave, times are invalid
    if (arrive.isSameOrBefore(prevLeave)) {
      $('#a-time-' + time).addClass('invalid');
      $('#l-time-' + (time - 1)).addClass('invalid');
      hoursValid = false;
    }

    if (!($('#ht-' + time).is(':checked'))) {
      $('#r-group-' + time).removeClass('invalid');
      $('#r-' + time).val('');
    }
    
    if (($('#ht-' + time).is(':checked')) && !rate.length) {
      $('#r-group-' + time).addClass('invalid');
      hoursValid = false;
    }
    else {
      $('#r-group-' + time).removeClass('invalid');
    }
  }

  return hoursValid;
}

function init() {
  initSettings();
  initSelects();
  initSetDate();
  initDueDate();
  initHandlers();
}

function initSettings() {

  // Initialize to defaults
  name = '';
  hoursPerDay = DEFAULT_HOURS_PER_DAY;
  hourStep = DEFAULT_HOUR_STEP;
  
  let settings = JSON.parse(localStorage.getItem('settings'));

  if (settings) {
    name = settings.name;
    hoursPerDay = settings.hoursPerDay;
    $('#settings-name').val(settings.name);
    $('#settings-hours-per-day').val(settings.hoursPerDay);
  }
}

function initSelects() {
  // Initialize hour selects
  let chooseHours = '\<option value=\"0\"\>Choose hours\<\/option\>\n';

  $('.edit-select').append(chooseHours);
  
  for (let value = 1; value <= hoursPerDay/hourStep; value++) {
    $('.edit-select').append('\<option value=\"' + value + '\"\>' + (value * hourStep) + '\<\/option\>\n');
  }
}

function initSetDate() {
  // Update locale to have Monday be the start of the week
  moment.updateLocale("en", { week: {
    dow: 1, // First day of week is Monday
    doy: 7  // First week of year must contain 1 January (7 + 1 - 1)
  }});
  
  // Initialize datepickers
  $('#set-date').datetimepicker({
    inline: true,
    format: 'YYYY-MM-DD'
  });

  $('#set-date').on('change.datetimepicker', function(event) {
    view($('#set-date').datetimepicker('date'));
    //    editCheck(event);
  });
}

function initDueDate() {
  // Determine due date
  // If end of period is Sunday, subtract two days to get due date
  // If end of period is Saturday, subtract one day to get due date

  // Assume end of period is the 15th
  let endOfPeriod = 15;
  
  if (moment().date() > 15) {
    endOfPeriod = moment().endOf('month').date();
  }

  if (moment().date(endOfPeriod).day() === 0) {
    dueDate = moment().date(endOfPeriod).subtract(2, 'days');
  }
  else if (moment().date(endOfPeriod).day() === 6) {
    dueDate = moment().date(endOfPeriod).subtract(2, 'days');
  }
  else {
    dueDate = moment().date(endOfPeriod);
  }

  // Time sheets must always be turned in by 8:00 am
  dueDate.hour(8);
  dueDate.minute(0);

  $('#due-date').prepend('Timesheet Due:  ' + dueDate.format('dddd, MMMM Do h:mm A'));
}

function initHandlers() {
  $('#settings').click(settings);
  $('#add').click(editCheck);
  $('#remove').click(editCheck);
  $('#edit-holiday').change(editCheck);
  $('.edit-select').change(editCheck);
  $('#edit-save').click(save);
  $('#edit-delete').click(editCheck);
  $('#print').click(print);
  $('#undo').click(undo);
  $('#status-dismiss').click(statusDismiss);
  $('#settings-save').click(saveSettings);
}

function undo() {
  if (((undoData.type === 'edit') && (undoData.record)) || (undoData.type === 'delete')) {
    localStorage.setItem(currentDate, JSON.stringify(undoData.record));
  }
  else {
    localStorage.removeItem(currentDate);
  }

  updateStatus('Undone');
  view(currentDate);
}

function view(date) {
  // Set current date
  currentDate = $('#set-date').datetimepicker('date').format('YYYY-MM-DD');

  // Check to see if current date has a record
  let record = JSON.parse(localStorage.getItem(currentDate));

  // First clear everything out as if nothing has been set, then process record
  clear();
  
  if (record) {
    $('#edit-activities').val(record.activities);
    $('#edit-vacation').val(record.vacation);
    $('#edit-sick').val(record.sick);

    if (record.holiday) {
      $('#edit-holiday').trigger('click');
    }

    if (record.vacation) {
      $('#edit-vacation').change();
    }

    if (record.sick) {
      $('#edit-sick').change();
    }

    if (record.hours) {
      let hours = JSON.parse(record.hours);

      hours.forEach(function(value, index) {
	$('#add').trigger('click');
	let _hours = JSON.parse(value);
	
	$('#a-' + index).datetimepicker('date', _hours.arrive);
	$('#l-' + index).datetimepicker('date', _hours.leave);
	$('#r-' + index).val(_hours.rate);

	if (_hours.hoursType) {
	  $('#ht-' + index).trigger('click');
	}
	else {
	  $('#l-' + index).trigger('change');
	}
      });
    }
  }
}

function clear() {
  $('#edit-activities').val('');
  $('#edit-holiday').prop('checked', false).prop('disabled', false);
  $('#holiday-status').html('No');
  $('.edit-select').val(0).prop('disabled', false);
  $('#add').prop('disabled', false).removeClass('btn-disabled');
  $('#edit-save').prop('disabled', true).addClass('btn-disabled');
  $('#edit-delete').prop('disabled', true).addClass('btn-disabled');
  removeTimes();
}

function settings() {
  $('#settings-modal').modal();

  $('#import-file-picker').change(function(event) {
    event.preventDefault();
    event.stopImmediatePropagation();
    if (this.files && this.files[0]) {
      let reader = new FileReader();
      reader.onload = function (e) {
	let lines = e.target.result.trim().split('\n');
	
	lines.forEach(function(line) {
	  let [key, value] = JSON.parse(line).split(STORAGE_DLM);
	  localStorage.setItem(key, value);
	});
	view(currentDate);
      }
      reader.readAsText(this.files[0]);
    }
  });

  $('#export').click(function () {
    let pairs = '';
    for (let index = 0; index < localStorage.length; index++) {
      let key = localStorage.key(index);
      let value = localStorage.getItem(key);
      
      pairs += (JSON.stringify(key + STORAGE_DLM + value)) + '\n';
    }
    download(pairs, 'localStorage.txt', 'text/plain');
  });
}

function save() {
  /*
     Items to save
     $('#edit-holiday').prop('checked');
     $('#edit-activities').val();
     $('#edit-vacation').val();
     $('#edit-sick').val();
     $('#ht-x').prop('checked');
     $('#a-x').datetimepicker('date');
     $('#l-x').datetimepicker('date');
     $('#r-x').val();
     $('#r-x').prop('disabled');
   */
  let regular = 0;
  let talent = 0;
  let hours = [];
  let hoursWorked = '';

  $('.times').each(function(index) {
    let _hours = new Hours(($('#ht-' + index).is(':checked')),
			   ($('#a-' + index).datetimepicker('date').format('LT')),
			   ($('#l-' + index).datetimepicker('date').format('LT')),
			   ($('#r-' + index).val()));

    hours.push(JSON.stringify(_hours));
    
    if (_hours.hoursType) {
      talent += moment(_hours.leave, 'LT').diff(moment(_hours.arrive, 'LT'), 'hours', true);
    }
    else {
      regular += moment(_hours.leave, 'LT').diff(moment(_hours.arrive, 'LT'), 'hours', true);
    }

    if (hoursWorked) {
      hoursWorked += ', ';
    }
    hoursWorked += _hours.arrive + '-' + _hours.leave;
  });

  let record = new Record((($('#edit-holiday').prop('checked')) ? hoursPerDay : 0),
			  ($('#edit-activities').val()),
			  ($('#edit-vacation').val()),
			  ($('#edit-sick').val()),
			  JSON.stringify(hours),
			  regular,
			  talent,
			  formatHoursWorked(hoursWorked));
  
  localStorage.setItem(currentDate, JSON.stringify(record));

  let status = '';

  let foo = JSON.parse(localStorage.getItem(currentDate));
  let fooHours = JSON.parse(foo.hours);
  console.log(fooHours);

  fooHours.forEach(function(value) {
    console.log(JSON.parse(value));
  });
  
  // Generate message for modal depending on whether or not information saved
  if (localStorage.getItem(currentDate)) {
    status = 'Record saved';
  }
  else {
    status = 'Save record failed';
  }

  updateStatus(status);
  //  view(currentDate);
}

function addTimes() {
  let numTimes = $('.times').length;
  let timesID = 'times-' + numTimes;
  let arriveTimeID = 'a-time-' + numTimes;
  let leaveTimeID = 'l-time-' + numTimes;
  let arriveID = 'a-' + numTimes;
  let leaveID = 'l-' + numTimes;
  let hoursTypeID = 'ht-' + numTimes;
  let statusID = 's-' + numTimes;
  let rateGroupID = 'r-group-' + numTimes;
  let rateID = 'r-' + numTimes;
  let arriveSelector = '#' + arriveID
  let leaveSelector = '#' + leaveID;
  let hoursTypeSelector = '#' + hoursTypeID;
  let rateSelector = '#' + rateID;

  let html = '<div id=\"' + timesID + '\" class=\"form-row times\">';
  html += '<div class=\"col-auto\">';
  html += '<div class=\"form-group\">';
  html += '<div class=\"d-block\">';
  html += '<label>Type</label>';
  html += '</div>';
  html += '<div class=\"custom-control custom-switch toggle\">';
  html += '<input type=\"checkbox\" class=\"custom-control-input non-holiday\" id=\"' + hoursTypeID + '\">';
  html += '<label class=\"custom-control-label toggle-label\" for=\"' + hoursTypeID + '\"><div id=\"' + statusID + '\" class=\"toggle-status\">Regular</div></label>';
  html += '</div>';
  html += '</div>';
  html += '</div>';
  html += '<div class=\"col-sm-12- col-md\">';
  html += '<div id=\"' + arriveTimeID + '\" class=\"form-group time arrive invalid\">';
  html += '<label class="time-label">Arrive</label>';
  html += '<div class=\"input-group date\" id=\"' + arriveID + '\" data-target-input=\"nearest\">';
  html += '<input type=\"text\" class=\"form-control form-control-sm datetimepicker-input\" data-target=\"' + arriveSelector + '\" data-toggle=\"datetimepicker\">';
  html += '<div class=\"input-group-append\" data-target=\"' + arriveSelector + '\" data-toggle=\"datetimepicker\">';
  html += '<div class=\"input-group-text\"><i class=\"fa fa-clock-o\"></i></div>';
  html += '</div>';
  html += '</div>';
  html += '</div>';
  html += '</div>';
  html += '<div class=\"col-sm-12 col-md\">';
  html += '<div id=\"' + leaveTimeID + '\" class=\"form-group time leave invalid\">';
  html += '<label class="time-label">Leave</label>';
  html += '<div class=\"input-group date\" id=\"' + leaveID + '\" data-target-input=\"nearest\">';
  html += '<input type=\"text\" class=\"form-control form-control-sm datetimepicker-input\" data-target=\"' + leaveSelector + '\" data-toggle=\"datetimepicker\">';
  html += '<div class=\"input-group-append\" data-target=\"' + leaveSelector + '\" data-toggle=\"datetimepicker\">';
  html += '<div class=\"input-group-text\"><i class=\"fa fa-clock-o\"></i></div>';
  html += '</div>';
  html += '</div>';
  html += '</div>';
  html += '</div>';
  html += '<div class=\"col-sm-12 col-md\">';
  html += '<div id=\"' + rateGroupID + '\" class=\"form-group\">';
  html += '<label>Rate</label>';
  html += '<div class=\"input-group input-group-sm\"\">';
  html += '<div class=\"input-group-prepend\">';
  html += '<div class=\"input-group-text\">$</div>';
  html += '</div>';
  html += '<input type=\"text\" id=\"' + rateID + '\" class=\"form-control rate\" disabled>';
  html += '<div class=\"input-group-append\">';
  html += '<div class=\"input-group-text\">/hr</div>';
  html += '</div>';
  html += '</div>';
  html += '</div>';
  html += '</div>';
  html += '</div>';
  html += '</div>';

  $('#edit-hours-worked').append(html);

  // Enable removal of times
  $('#remove').prop('disabled', false).removeClass('btn-disabled');
  
  $(arriveSelector).datetimepicker({
    format: 'LT',
    stepping: DEFAULT_TIME_STEP
  });

  $(leaveSelector).datetimepicker({
    format: 'LT',
    stepping: DEFAULT_TIME_STEP
  });

  $(arriveSelector).datetimepicker('date', '00:00');
  $(leaveSelector).datetimepicker('date', '00:00');

  $(arriveSelector).on('change.datetimepicker', editCheck);
  $(leaveSelector).on('change.datetimepicker', editCheck);

  $(hoursTypeSelector).change(editCheck);
  $(rateSelector).on('paste', function(event) {
    event.preventDefault();
    editCheck(event);
  });

  $(rateSelector).on('input', function(event) {
    if (event.originalEvent.inputType === 'insertFromPaste') {
      event.preventDefault();
    }
    else {
      editCheck(event);
    }
  });
}

function removeTimes(instance = '') {
  $('.times' + instance).children('.datetimepicker-input').datetimepicker('destroy');
  $('.times' + instance).remove();

  // If there are no more times left, disable the remove button
  if (!($('.times').length)) {
    $('#remove').prop('disabled', true).addClass('btn-disabled');
  }
}

function print() {
  // Determine date range of pay period and read info for that date range
  // If current date is <= 15, then pay period is 1st through 15th.
  // Otherwise, it's 16th through the end of the month.
  
  let year = moment().year();
  let month = ('0' + (moment().month() + 1)).slice(-2);
  let startDate;
  let endDate;

  if (moment().date() <= 15) {
    startDate = moment(year + '-' + month + '-01');
    endDate = moment(year + '-' + month + '-15');
  }
  else {
    startDate = moment(year + '-' + month + '-16');
    endDate = moment(year + '-' + month + '-' + moment().endOf('month').date());
  }

  let date = moment(startDate);
  let regular = 0; // Total regular hours worked in pay period
  let vacation = 0;
  let holiday = 0;
  let talent = 0;
  let sick = 0;
  let weeklyHours = 0;
  let table = '';
  let overtime = 0;
  let prevPeriodHours = 0;  // Hours worked in previous pay period that contribute to overtime for first week of this pay period

  // Determine the date of the previous Monday
  let prevPayDay = moment(startDate).day(1);

  // Collect up all the regular hours from prevMonday until startDate
  while (prevPayDay.isBefore(startDate, 'day')) {
    let record = JSON.parse(localStorage.getItem(prevPayDay.format('YYYY-MM-DD')));

    if (record) {
      prevPeriodHours += record.regular;
    }
    prevPayDay.add(1, 'day');
  }

  // Iterate over all dates in the pay period
  while (date.isSameOrBefore(endDate, 'day')) {
    
    let hoursWorked = ''; // Range of times worked
    let hours = '';       // Total regular hours for day
    let activities = '';
    let record = JSON.parse(localStorage.getItem(date.format('YYYY-MM-DD')));

    if (record) {
      if (hoursWorked) {
	hoursWorked += ', ';
      }
      hoursWorked += record.hoursWorked;
      weeklyHours += record.regular;
      regular += record.regular;
      hours = record.total;
      holiday += Number(record.holiday);
      talent += record.talent;
      vacation += Number(record.vacation);
      sick += Number(record.sick);
      activities = record.activities;
    }

    let rowClass = '';

    // If it's a weekend, shade area on timesheet
    if (((date.day()) === 0) || ((date.day()) === 6)) {
      rowClass = ' class=\"shaded\"';
    }

    // If it's a Sunday, determine overtime for the week
    if ((date.day()) === 0) {
      if (weeklyHours + prevPeriodHours > 40) {
	overtime += (weeklyHours + prevPeriodHours - 40);
	regular -= (weeklyHours + prevPeriodHours - 40);
	if (regular < 0) {regular = 0;}
      }
      weeklyHours = 0;  // Reset weekly hours on Sunday
      prevPeriodHours = 0; // Reset hours worked in previous pay period that affect first week of this period
    }

    // Determine if we need to use a smaller font for either hoursWorked or hours
    let hoursSize = '';
    let hoursWorkedSize = '';
    
    if (hours.length > 9) {
      hoursSize = ' style=\"font-size:10px;text-align:left;vertical-align:top;\"';
    }

    if (hoursWorked.length > 20) {
      hoursWorkedSize = ' style=\"font-size:10px;text-align:left;vertical-align:top;\"';
    }
    
    table += '<tr' + rowClass + '><td style=\"font-size:6mm;\">' + date.format('M/D') + '</td><td' + hoursWorkedSize +'>' + hoursWorked + '</td><td' + hoursSize + '>' + hours + '</td><td class=\"activitiesText\">' + activities + '</td></tr>';

    date.add(1, 'day');
  }

  let printWindow = window.open('print.html');

  printWindow.onload = function () {
    let name = localStorage.getItem('name');

    if (name) {
      $(printWindow.document).contents().find('#name').append('<span class="underline">' + name + '&nbsp;&nbsp;&nbsp;&nbsp;</span>');
    }

    let formattedDueDate = dueDate.format('dddd, MMMM Do') + '<br>' + dueDate.format('h:mm A');
    let totalHoursPaid = '';

    if (Number(regular + holiday + vacation + sick)) {
      totalHoursPaid = (Number(regular + holiday + vacation + sick)).toFixed(2);
    }

    if (overtime) {
      if (totalHoursPaid) {
	totalHoursPaid += ' + ' + overtime.toFixed(2) + ' overtime';
      }
      else {
	totalHoursPaid = overtime.toFixed(2) + ' overtime';
      }
    }

    if (talent) {
      if (totalHoursPaid) {
	totalHoursPaid += ' + ' + talent;
      }
      else {
	totalHoursPaid = talent;
      }
    }
    
    $(printWindow.document).contents().find('#due-date').html(formattedDueDate);
    $(printWindow.document).contents().find('#dates').html(startDate.format('M/D/YY') + ' - ' + endDate.format('M/D/YY'));
    $(printWindow.document).contents().find('#print-table').append(table);
    $(printWindow.document).contents().find('#total-hours-paid').html(totalHoursPaid);
    $(printWindow.document).contents().find('#total-hours-worked').html(regular ? Number(regular).toFixed(2) : '');
    $(printWindow.document).contents().find('#sick').html(sick ? Number(sick).toFixed(2) : '');
    $(printWindow.document).contents().find('#vacation').html(vacation ? Number(vacation).toFixed(2) : '');
    $(printWindow.document).contents().find('#holiday').html(holiday ? Number(holiday).toFixed(2) : '');
  }
}

function deleteRecord() {
  let record = JSON.parse(localStorage.getItem(currentDate));

  undoData = new Undo('delete', record);
  localStorage.removeItem(currentDate);
  updateStatus('Record deleted');
  view(currentDate);
}

function updateStatus(msg) {
  if (msg === 'Undone') {
    $('#status-contents').fadeOut(200, function (event) {
      $('#undo').addClass('hide');
      $('#status-msg').html(msg);
      $('#status-contents').fadeIn(200);
      setTimeout( () => {$('#status-dismiss').click();}, UNDONE_TIMEOUT);
    });
  }
  else {
    $('#undo').removeClass('hide');
    $('#status-msg').html(msg);
    $('#status').fadeIn(400);
    setTimeout( () => {$('#status-dismiss').click();}, STATUS_TIMEOUT);
  }
}

function statusDismiss() {
  $('#status').fadeOut(400);
}

function saveSettings() {
  name = $('#settings-name').val();
  hoursPerDay = $('#settings-hours-per-day').val();
  
  let settings = new Settings(name, hoursPerDay);
  
  localStorage.setItem('settings', JSON.stringify(settings));
}

function saveSettingsCheck() {
}

function formatHoursWorked(hoursWorked) {
  // Remove :, remove 00, convert AM to a and PM to p
  let _hoursWorked = hoursWorked;
  _hoursWorked = _hoursWorked.replace(/:/g, '');
  _hoursWorked = _hoursWorked.replace(/00/g, '');
  _hoursWorked = _hoursWorked.replace(/ AM/g, 'a');
  _hoursWorked = _hoursWorked.replace(/ PM/g, 'p');

  return _hoursWorked;
}

$(function() {
  init();
  view($('#set-date').datetimepicker('date'));
});
