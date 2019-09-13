const HOURS_PER_DAY = 8.00;
const HOUR_STEP = 0.25;
const TIME_STEP = 15;
const STORAGE_DLM = '\u0000';
const HOURS_STORAGE_DLM = '\u0001';
const STATUS_TIMEOUT = 5000;
const UNDONE_TIMEOUT = 1250;
const HOURS_PER_WORK_WEEK = 40;

let currentDate;
let dueDate;
let undoData;
let name;

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

function Undo(type, record) {
  this.type = type;
  this.record = record;
}

function editCheck(event) {
  let target = event.target.id;
  let targetSelector = '#' + target;
  let instance = target.match(/\d+$/) ? target.match(/\d+$/)[0] : null;

  // Default to saving and deleting record being disabled
  $('.save').prop('disabled', true).addClass('btn-disabled disabled');

  if (target === 'edit-holiday') {
    if ($(this).is(':checked')) {
      $('.non-holiday').prop('disabled', true);
      $('.btn-hours').addClass('btn-disabled');
      $('#holiday-status').html('Yes');
      $('.save').prop('disabled', false).removeClass('btn-disabled disabled');
      if ($('.times').length) { removeTimes(); }
    }
    else {
      $('.non-holiday').prop('disabled', false);
      $('#add').removeClass('btn-disabled');
      $('#remove').prop('disabled', true);
      $('#holiday-status').html('No');
    }
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
      
      /* If pasting, rate value hasn't been updated yet.  Get current value
	 paste in value and check against valid currency format.  If valid
	 update input.  If typing, rate value will already be updated.  Check
	 against valid currency format.  If not valid, remove character that
	 was typed in.
       */
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
      $('.save').prop('disabled', false).removeClass('btn-disabled disabled');
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
  initSelects();
  initSetDate();
  initDueDate();  
  initHandlers();
}

function initDueDate() {
  let dueDate = getDueDate();
  $('#due-date').prepend('Timesheet Due:  ' + dueDate.format('dddd, MMMM Do h:mm A'));
}

function initSelects() {
  // Initialize hour selects
  let chooseHours = '\<option value=\"0\"\>Choose hours\<\/option\>\n';

  $('.edit-select').append(chooseHours);
  
  for (let value = 1; value <= HOURS_PER_DAY/HOUR_STEP; value++) {
    $('.edit-select').append('\<option value=\"' + value + '\"\>' + (value * HOUR_STEP) + '\<\/option\>\n');
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
  $('#add').click(editCheck);
  $('#remove').click(editCheck);
  $('#edit-holiday').change(editCheck);
  $('.edit-select').change(editCheck);
  $('.save').click(save);
  $('.delete').click(deleteRecord);
  $('#print').click(print);
  $('#undo').click(undo);
  $('#status-dismiss').click(statusDismiss);
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
    $('.delete').prop('disabled', false).removeClass('btn-disabled disabled');
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
  $('.save').prop('disabled', true).addClass('btn-disabled disabled');
  $('.delete').prop('disabled', true).addClass('btn-disabled disabled');
  removeTimes();
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

  let record = new Record((($('#edit-holiday').prop('checked')) ? HOURS_PER_DAY : 0),
			  ($('#edit-activities').val()),
			  (Number($('#edit-vacation').val())),
			  (Number($('#edit-sick').val())),
			  JSON.stringify(times));
  
  localStorage.setItem(currentDate, JSON.stringify(record));

  let status = '';

  // Generate message for modal depending on whether or not information saved
  // Also make deleting record possible
  if (localStorage.getItem(currentDate)) {
    status = 'Record saved';
    $('.delete').prop('disabled', false).removeClass('btn-disabled disabled');
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
    stepping: TIME_STEP
  });

  $(leaveSelector).datetimepicker({
    format: 'LT',
    stepping: TIME_STEP
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
  initDueDate();

  /*
     start: The first day of the pay period
     end:   The last day of the pay period
     date: Current date being processed
     holiday: Total holiday hours used during pay period
     vacation: Total vacation hours used during pay period
     sick: Total sick leave taken during pay period
     regular: Total non-talent hours worked during pay period
     talent: Total talent hours worked during pay period (doesn't include talent fees)
     rate: Total amount to be paid for talent hours during pay period (excludes talent fees)
     weekly: Total regular and talent hours worked for a given week WITHIN the pay period
     overtime: Total overtime hours to be paid during pay period
     notes: Number of notes that have been generated during pay period.  Notes occur for vacation, sick and talent
     previous:  Total regular and talent hours worked from Monday before start until start
     row: HTML for table row for date
   */
  
  let [start, end] = getPayPeriod();
  let date = moment(start);  // Date being processed
  let holiday = 0;
  let vacation = 0;
  let sick = 0;
  let regular = 0;
  let talent = 0;
  let rate = 0;
  let weekly = 0;
  let overtime = 0;
  let notes = 0;
  let previous = getPreviousHours(start);
  let row = '';

  // Iterate over all dates in the pay period
  while (date.isSameOrBefore(end, 'day')) {
    let hours = '';  // Total of all hours for the day
    let activities = '';
    let dayparts = '';
    let notesHtml = '';
    let record = JSON.parse(localStorage.getItem(date.format('YYYY-MM-DD')));


    /*
       If there is a record for the day, retrieve it.
       _dayparts: The time ranges worked on a given day
       _regular: The total number of regular hours worked for a given day
       _talent: The total number of talent hours worked for a given day
       _rate: The total amount to be paid for talent hours on a given day
     */
    if (record) {
      let [_dayparts, _regular, _talent, _rate] = processTimes(JSON.parse(record.times));
      
      holiday += Number(record.holiday);
      vacation += Number(record.vacation);
      sick += Number(record.sick);
      activities = record.activities;
      dayparts = _dayparts;
      regular += _regular;
      talent += _talent;
      rate += _rate;
      // weekly += _regular + _talent;
      weekly += _regular;
      hours = Number(_regular + _talent + record.holiday + record.vacation + record.sick);
    }

    /* If it's a Sunday, determine regular and overtime hours for the week.  The work week is considered Monday - Sunday, so
       in cases where the current pay period starts on a day other than Monday, the hours worked from the last Monday of the
       previous period until the start of the current period (previous) need to be taken into account for computing overtime.
       The total number of hours worked in a week is always previous + weekly, though previous will only be > 0 during
       the first week of the current pay perdiod.  Overtime occurs when weekly + previous is > HOURS_PER_WORK_WEEK.
       If previous is >= HOURS_PER_WORK_WEEK, then overtime is just equal to weekly and the overtime (weekly) should be 
       subtracted from regular.  Otherwise, overtime is equal to weekly + previous - HOURS_PER_WORK_WEEK, and this same
       amount should be subtracted from regular.  Here are a couple examples:

       previous = 48, weekly = 10, HOURS_PER_WORK_WEEK = 40:

       Total hours worked in the week is 58, which means 18 hours of overtime need to be paid.  However, eight of those overtime
       hours occurred during the previous pay period and have already been paid.  Only the 10 additional hours worked in this
       pay period should be counted as overtime.

       previous = 32, weekly = 12, HOURS_PER_WORK_WEEK = 40:
       
       Total hours worked in the week is 44.  Since previous was < HOURS_PER_WORK_WEEK, no overtime occurs until
       previous + weekly exceeds HOURS_PER_WORK_WEEK.  In this case, that means the first eight hours of weekly
       are just regular hours.  The remaiing four hours are overtime.
     */
    
    if ((date.day()) === 0) {
      if ((previous + weekly) > HOURS_PER_WORK_WEEK) {
	if (previous >= HOURS_PER_WORK_WEEK) {
	  overtime += weekly;
	  regular -= weekly;
	}
	else {
	  overtime += (weekly + previous - HOURS_PER_WORK_WEEK);
	  regular -= (weekly + previous - HOURS_PER_WORK_WEEK);
	}
      }
      regular = regular < 0 ? 0 : regular;
      weekly = 0;
      previous = 0;
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


    // Determine if we need to use a smaller font to fit dayparts in table cell
    let daypartsSize = '';
    
    if (dayparts.length > 16) {
      daypartsSize = ' style=\"font-size:10px;text-align:left;vertical-align:top;\"';
    }
    
    row += '<tr' + rowClass + '><td style=\"font-size:6mm;\">' + date.format('M/D') + '</td><td' + daypartsSize +'>' + dayparts + '</td><td>' + hours + '</td><td class=\"activitiesText\">' + activities + '</td></tr>';
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
      totalHoursPaid += ' + ' + overtime.toFixed(2) + ' overtime';
    }

    if (talent) {
      totalHoursPaid += ' + ' + talent.toFixed(2) + 'R @ $' + rate.toFixed(2);
    }
    
    $(printWindow.document).contents().find('#due-date').html(formattedDueDate);
    $(printWindow.document).contents().find('#dates').html(start.format('M/D/YY') + ' - ' + end.format('M/D/YY'));
    $(printWindow.document).contents().find('#print-table').append(row);
    $(printWindow.document).contents().find('#total-hours-paid').html(totalHoursPaid);
    $(printWindow.document).contents().find('#total-hours-worked').html((regular || talent) ? regular + talent : '');
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
}

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

function getPreviousHours(start) {
  // Determine the date of the previous Monday
  let previousDay = start.day() ? moment(start).subtract((start.day() - (start.day() - 1)), 'days') : moment(start).subtract(6, 'days');
  let previousHours = 0;

  // Collect up all the hours from Monday of the previous pay period until start
  while (previousDay.isBefore(start)) {
    let record = JSON.parse(localStorage.getItem(previousDay.format('YYYY-MM-DD')));

    if (record) {
      let [_dayparts, _regular, _talent, _rate] = processTimes(JSON.parse(record.times));
      previousHours += _regular + _talent;
    }
    previousDay.add(1, 'day');
  }
  return previousHours;
}

function processTimes(times) {
  let dayparts = '';
  let regular = 0;
  let talent = 0;
  let rate = 0;
  
  times.forEach(function(value, index) {
    let _times = JSON.parse(value);

    if (dayparts) {
      dayparts += ', ';
    }
    dayparts += formatDayparts(_times.arrive, _times.leave);
    if (_times.hoursType) {
      talent += Number(moment(_times.leave, 'LT').diff(moment(_times.arrive, 'LT'), 'hours', true));
      rate += Number(_times.rate);
    }
    else {
      regular += Number(moment(_times.leave, 'LT').diff(moment(_times.arrive, 'LT'), 'hours', true));
    }
  });

  return [dayparts, regular, talent, rate];
}

function formatDayparts(arrive, leave) {
  let dayparts = arrive + '-' + leave;
  // Remove :, remove 00, convert AM to a and PM to p
  dayparts = dayparts.replace(/:/g, '');
  dayparts = dayparts.replace(/00/g, '');
  //  dayparts = dayparts.replace(/ AM/g, 'a');
  //  dayparts = dayparts.replace(/ PM/g, 'p');
  dayparts = dayparts.replace(/ AM/g, '');
  dayparts = dayparts.replace(/ PM/g, '');

  return dayparts;
}

$(function() {
  init();
  view($('#set-date').datetimepicker('date'));
});
