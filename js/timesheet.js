// Undo cases:  deleted record, saving record with no previous record saved, saving record with previous record saved

const DEFAULT_TIME_DUE = '8:00 AM';
const DEFAULT_HOURS_PER_DAY = 8.00;
const DEFAULT_HOUR_STEP = 0.25;
const DEFAULT_TIME_STEP = 15;
const STORAGE_DLM = '\u0000';
const HOURS_STORAGE_DLM = '\u0001';
const STATUS_TIMEOUT = 5000;
const UNDONE_TIMEOUT = 1250;
const HOURS_PER_WORK_WEEK = 40;

let currentDate;
let dueDate;
let undoData;
let name;
let hoursPerDay;
let hourStep;

function Record(holiday, activities, vacation, sick, times) {
  this.holiday = holiday;
  this.activities = activities;
  this.vacation = vacation;
  this.sick = sick;
  this.times = times;
}

function Times(hoursType, arrive, leave, rate) {
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

  if (target === 'edit-holiday') {
    if ($(this).is(':checked')) {
      $('.non-holiday').prop('disabled', true);
      $('.btn-hours').addClass('btn-disabled');
      $('#holiday-status').html('Yes');
      $('#edit-save').prop('disabled', false).removeClass('btn-disabled');
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

    // If arrive is before previous leave, times are invalid
    if (arrive.isBefore(prevLeave)) {
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

function initDueDate() {
  let dueDate = getDueDate();
  $('#due-date').prepend('Timesheet Due:  ' + dueDate.format('dddd, MMMM Do h:mm A'));
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
  });
}

function getDueDate() {
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
    dueDate = moment().date(endOfPeriod).subtract(1, 'days');
  }
  else {
    dueDate = moment().date(endOfPeriod);
  }

  // Time sheets must always be turned in by 8:00 am
  dueDate.hour(8);
  dueDate.minute(0);

  return dueDate;
}

function initHandlers() {
  $('#settings').click(settings);
  $('#add').click(editCheck);
  $('#remove').click(editCheck);
  $('#edit-holiday').change(editCheck);
  $('.edit-select').change(editCheck);
  $('#edit-save').click(save);
  $('#edit-delete').click(deleteRecord);
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
    $('#edit-delete').prop('disabled', false).removeClass('btn-disabled');
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

    if (record.times) {
      let times = JSON.parse(record.times);

      times.forEach(function(value, index) {
	$('#add').trigger('click');
	let _times = JSON.parse(value);
	
	$('#a-' + index).datetimepicker('date', _times.arrive);
	$('#l-' + index).datetimepicker('date', _times.leave);
	$('#r-' + index).val(_times.rate);

	if (_times.hoursType) {
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
  // If no record exists, undoData should be set to new
  // If a record already exists, undoData should be set to that record
  undoData = new Undo('new', '');

  let previousRecord = JSON.parse(localStorage.getItem(currentDate));

  if (previousRecord) {
    undoData = new Undo('edit', previousRecord);
  }

  let times = [];

  $('.times').each(function(index) {
    let _times = new Times(($('#ht-' + index).is(':checked')),
			   ($('#a-' + index).datetimepicker('date').format('LT')),
			   ($('#l-' + index).datetimepicker('date').format('LT')),
			   ($('#r-' + index).val()));

    times.push(JSON.stringify(_times));
  });

  let record = new Record((($('#edit-holiday').prop('checked')) ? hoursPerDay : 0),
			  ($('#edit-activities').val()),
			  ($('#edit-vacation').val()),
			  ($('#edit-sick').val()),
			  JSON.stringify(times));
  
  localStorage.setItem(currentDate, JSON.stringify(record));

  let status = '';

  // Generate message for modal depending on whether or not information saved
  // Also make deleting record possible
  if (localStorage.getItem(currentDate)) {
    status = 'Record saved';
    $('#edit-delete').prop('disabled', false).removeClass('btn-disabled');
  }
  else {
    status = 'Save record failed';
  }

  updateStatus(status);
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
  // Set due date
  initDueDate();
    
  // Determine date range of pay period and read info for that date range
  // If current date is <= 15, then pay period is the 1st through 15th.
  // Otherwise, it's the 16th through the end of the month.

  let [startDate, endDate] = getPayPeriod();
  let date = moment(startDate);
  let regularHours = 0; // Total regular hours worked in pay period
  let vacation = 0;
  let holiday = 0;
  let talent = '';
  let sick = 0;
  let weeklyHours = 0; // Total regular hours in a given week
  let table = '';
  let overtime = 0;
  let notes = 0; // Number of notes, notes are added whenever vacation, sick leave or talent hours occur for a given day.  Each day gets its own note.
  let previousHours = getPreviousHours(startDate);  // Hours worked in previous pay period that contribute to overtime for first week of this pay period

  // Iterate over all dates in the pay period
  while (date.isSameOrBefore(endDate, 'day')) {
    let hoursWorked = ''; // Range of times worked
    let total = '';       // Total regular hours for the day (holiday/regular + vacation + sick)
    let activities = '';
    let record = JSON.parse(localStorage.getItem(date.format('YYYY-MM-DD')));
    let notesHtml = '';

    if (record) {
      if (hoursWorked) {
	hoursWorked += ', ';
      }
      hoursWorked += record.hoursWorked;
      weeklyHours += getHours(JSON.parse(record.times));
      regularHours += getHours(JSON.parse(record.times));
      total = record.total;
      holiday += Number(record.holiday);
      //      talent = processTalentRates(talent, JSON.parse(record.talent));
      vacation += Number(record.vacation);
      sick += Number(record.sick);
      activities = record.activities;
    }

    // Generate notes
    if (talent || vacation || sick) {
      notesHtml = processNotes(++notes, talent, vacation, sick)
    }

    let rowClass = '';

    // If it's a weekend, shade area on timesheet
    if (((date.day()) === 0) || ((date.day()) === 6)) {
      rowClass = ' class=\"shaded\"';
    }

    // If it's a Sunday, determine overtime for the week
    // Overtime cases:  Hours during previous pay period already went over 40.  Those overtime hours would've already been paid.
    // Previous hours + current hours are > 40, so difference is overtime
    if ((date.day()) === 0) {
      if ((previousHours + weeklyHours) > HOURS_PER_WORK_WEEK) {
	if (previousHours > HOURS_PER_WORK_WEEK) {
	  overtime += weeklyHours;
	}
	else {
	  overtime += (weeklyHours + previousHours - HOURS_PER_WORK_WEEK);
	}
      }

      /* if (weeklyHours + previousHours > HOURS_PER_WEEK) {
	 overtime += (weeklyHours + previousHours - HOURS_PER_WORK_WEEK);
	 regularHours -= (weeklyHours + previousHours - HOURS_PER_WORK_WEEK);
	 if (regularHours < 0) {regularHours = 0;}
       * }*/
      weeklyHours = 0;  // Reset weekly hours on Sunday
      previousHours = 0; // Reset hours worked in previous pay period that affect first week of this period
      console.log(overtime);
    }

    // Determine if we need to use a smaller font for hoursWorked
    let hoursWorkedSize = '';
    
    if (hoursWorked.length > 16) {
      hoursWorkedSize = ' style=\"font-size:10px;text-align:left;vertical-align:top;\"';
    }
    
    table += '<tr' + rowClass + '><td style=\"font-size:6mm;\">' + date.format('M/D') + '</td><td' + hoursWorkedSize +'>' + hoursWorked + '</td><td>' + total + '</td><td class=\"activitiesText\">' + activities + '</td></tr>';
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

    if (Number(regularHours + holiday + vacation + sick)) {
      totalHoursPaid = (Number(regularHours + holiday + vacation + sick)).toFixed(2);
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
    $(printWindow.document).contents().find('#total-hours-worked').html(regularHours ? Number(regularHours).toFixed(2) : '');
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
      $('#undo').hide();
      $('#status-msg').html(msg);
      $('#status-contents').fadeIn(200);
      setTimeout( () => {$('#status-dismiss').click();}, UNDONE_TIMEOUT);
    });
  }
  else {
    $('#undo').show();
    $('#status-msg').html(msg);
    $('#status').fadeIn(400);
    setTimeout( () => {$('#status-dismiss').click();}, STATUS_TIMEOUT);
  }
}

function statusDismiss() {
  $('#status').fadeOut(400);
}

function processNotes(notes, talent, vacation, sick) {
  let noteHtml = '\<sup\>' + notes + '\<\/sup\>';
  
  for (let [key, value] of talent.entries()) {
  }
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

// Utility functions
function getPayPeriod() {
  let year = moment().year();
  let month = ('0' + (moment().month() + 1)).slice(-2);

  if (moment().date() <= 15) {
    return [moment(year + '-' + month + '-01'), moment(year + '-' + month + '-15')];
  }
  else {
    return [moment(year + '-' + month + '-16'), moment(year + '-' + month + '-' + moment().endOf('month').date())];
  }
}

function getPreviousHours(startDate) {
  // Determine the date of the previous Monday
  let previousDay = startDate.day() ? moment(startDate).subtract((startDate.day() - (startDate.day() - 1)), 'days') : moment(startDate).subtract(6, 'days');
  let previousHours = 0;

  // Collect up all the hours from Monday of the previous pay period until startDate
  while (previousDay.isBefore(startDate)) {
    let record = JSON.parse(localStorage.getItem(previousDay.format('YYYY-MM-DD')));

    if (record) {
      previousHours += getHours(JSON.parse(record.times));
    }
    previousDay.add(1, 'day');
  }
  return previousHours;
}

function getHours(times) {
  let hours = 0;

  times.forEach(function(value, index) {
    let _times = JSON.parse(value);
    hours += Number(moment(_times.leave, 'LT').diff(moment(_times.arrive, 'LT'), 'hours', true));;
  });

  return hours;
}
