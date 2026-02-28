// decisionAgent.js
// Decision-making agent for workforce management (leave, scheduling, alerts, workload analysis)
// ES6 module-style object. Ready to integrate into UI or Node environment.
// No HTML/CSS included. Detailed comments provided.

/*
Usage (example):
import DecisionAgent from './decisionAgent.js';
const agent = DecisionAgent.create({ currentUserId: 1, currentUserRole: 'manager' });
agent.submitLeaveRequest({ employeeId: 5, startDate: '2026-03-20', endDate: '2026-03-22', type: 'vacances', comment: '...'})
*/

const DecisionAgent = (function () {
  // ---------- Utilities ----------
  const Utils = {
    formatDate(d) {
      if (typeof d === 'string') return d;
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    },
    parseDate(s) {
      // Accept YYYY-MM-DD or Date
      if (!s) return null;
      if (s instanceof Date) {
        const d = new Date(s);
        d.setHours(0, 0, 0, 0);
        return d;
      }
      const parts = s.split('-').map(x => parseInt(x, 10));
      if (parts.length === 3) return new Date(parts[0], parts[1] - 1, parts[2]);
      return new Date(s);
    },
    daysBetween(startDate, endDate) {
      const msPerDay = 24 * 60 * 60 * 1000;
      const a = Utils.parseDate(startDate);
      const b = Utils.parseDate(endDate);
      return Math.round((b - a) / msPerDay);
    },
    rangeDates(startDate, endDate) {
      const s = Utils.parseDate(startDate);
      const e = Utils.parseDate(endDate);
      const out = [];
      const msPerDay = 24 * 60 * 60 * 1000;
      for (let d = new Date(s); d <= e; d = new Date(d.getTime() + msPerDay)) {
        out.push(Utils.formatDate(d));
      }
      return out;
    },
    nowISO() {
      return new Date().toISOString();
    }
  };

  // ---------- Default Data / Config ----------
  const Defaults = {
    minEmployeesPresent: 8,
    minPharmacistPerDay: 1,
    minDaysLead: 14,
    shiftsPerDay: ['morning', 'afternoon'], // each shift 4h
    shiftHours: 4,
    maxHoursPerDay: 8,
    activityStaffMap: { normal: 3, elevated: 4, critical: 5 }, // staff per shift
  };

  // ---------- Data Store ----------
  function createStore(opts = {}) {
    // Sample employees list (can be replaced by consumer)
    const employees = opts.employees || [
      { id: 1, name: 'Dr. Sophie Martin', role: 'pharmacist', diploma: true, maxHours: 35 },
      { id: 2, name: 'Dr. Pierre Dubois', role: 'pharmacist', diploma: true, maxHours: 35 },
      { id: 3, name: 'Dr. Marie Laurent', role: 'pharmacist', diploma: true, maxHours: 40 },
      { id: 4, name: 'Alice Bernard', role: 'preparateur', diploma: false, maxHours: 35 },
      { id: 5, name: 'Thomas Petit', role: 'preparateur', diploma: false, maxHours: 35 },
      { id: 6, name: 'Julie Bonnet', role: 'administratif', diploma: false, maxHours: 30 }
    ];

    // Leaves and absences storage
    const leaveRequests = []; // {id, employeeId, startDate, endDate, type, comment, status, submittedAt, decidedBy, decidedAt}
    const absences = []; // {employeeId, date, reason, createdAt}
    const currentSchedule = []; // shifts
    const currentAlerts = []; // {type, title, message, time}
    const notifications = []; // queue for dashboard

    let leaveCounter = 1;

    return {
      employees,
      leaveRequests,
      absences,
      currentSchedule,
      currentAlerts,
      notifications,
      getNextLeaveId() { return leaveCounter++; },
    };
  }

  // ---------- Alerts & Notifications ----------
  function createAlertManager(store) {
    function triggerManagerAlert(message, meta = {}) {
      const alert = {
        type: 'info',
        title: 'Manager Notification',
        message,
        time: Utils.nowISO(),
        ...meta
      };
      store.currentAlerts.unshift(alert);
      // also push to notification queue
      store.notifications.unshift({ id: Utils.nowISO(), message, time: Utils.nowISO(), level: 'info' });
      return alert;
    }

    function pushAlert(type, title, message) {
      const alert = { type, title, message, time: Utils.nowISO() };
      store.currentAlerts.unshift(alert);
      store.notifications.unshift({ id: Utils.nowISO(), message: `${title}: ${message}`, time: Utils.nowISO(), level: type });
      return alert;
    }

    function displayAlerts(alertsArray = store.currentAlerts, options = {}) {
      // Return structured representation for UI (don't assume UI rendering here)
      return alertsArray.map(a => ({ type: a.type, title: a.title, message: a.message, time: a.time }));
    }

    return { triggerManagerAlert, pushAlert, displayAlerts };
  }

  // ---------- Leave Management ----------
  function createLeaveManager(store, config = Defaults, alertManager) {
    /*
      Logic summary:
      - submitLeaveRequest(request): validate fields, check 14-day rule, build per-day list
      - For each date, check existing approved absences and compute available employees after request
      - Check pharmacist coverage
      - If any date fails -> reject (or return pending if manager decision required)
      - If auto-approved -> set status and add per-day absences
    */

    // Helper: count absences on a date
    function countAbsencesOnDate(dateStr) {
      return store.absences.filter(a => a.date === dateStr).length;
    }

    // Helper: count pharmacists (with diploma) absent on date
    function countPharmacistsAbsentOnDate(dateStr) {
      const pharmacists = store.employees.filter(e => e.role === 'pharmacist' && e.diploma);
      return store.absences.filter(a => a.date === dateStr && pharmacists.some(p => p.id === a.employeeId)).length;
    }

    // Submit leave request
    async function submitLeaveRequest({ employeeId, startDate, endDate, type = 'vacances', comment = '' } = {}) {
      // Validate employee exists
      const employee = store.employees.find(e => e.id === employeeId);
      if (!employee) {
        return { success: false, reason: 'EMPLOYEE_NOT_FOUND' };
      }

      if (!startDate || !endDate) {
        return { success: false, reason: 'INVALID_DATES' };
      }

      const start = Utils.parseDate(startDate);
      const end = Utils.parseDate(endDate);
      if (end < start) return { success: false, reason: 'END_BEFORE_START' };

      const today = new Date(); today.setHours(0,0,0,0);
      const daysUntilStart = Utils.daysBetween(Utils.formatDate(today), Utils.formatDate(start));
      if (daysUntilStart < config.minDaysLead) {
        return { success: false, reason: 'LEAD_TIME_VIOLATION', message: `Requests must be submitted at least ${config.minDaysLead} days before start.` };
      }

      // Build date list (inclusive)
      const dates = Utils.rangeDates(Utils.formatDate(start), Utils.formatDate(end));

      // Check conflicts with existing approved absences for same employee
      const conflicts = dates.filter(dt => store.absences.some(a => a.employeeId === employeeId && a.date === dt));
      if (conflicts.length > 0) {
        return { success: false, reason: 'CONFLICT_WITH_EXISTING_ABSENCE', conflicts };
      }

      // Decision checks per date
      const failingDates = [];
      const pharmacists = store.employees.filter(e => e.role === 'pharmacist' && e.diploma);
      for (const dt of dates) {
        const absCount = store.absences.filter(a => a.date === dt).length;
        const availableAfter = store.employees.length - (absCount + 1); // +1 if request approved
        if (availableAfter < config.minEmployeesPresent) {
          failingDates.push({ date: dt, reason: `Insufficient coverage: ${availableAfter} present if approved` });
          continue;
        }

        const pharmAbs = store.absences.filter(a => a.date === dt && pharmacists.some(p => p.id === a.employeeId)).length;
        const requesterIsPharmacist = employee.role === 'pharmacist' && employee.diploma;
        const pharmacistsAfter = pharmacists.length - (pharmAbs + (requesterIsPharmacist ? 1 : 0));
        if (pharmacistsAfter < config.minPharmacistPerDay) {
          failingDates.push({ date: dt, reason: `Pharmacist coverage would be < ${config.minPharmacistPerDay}` });
        }
      }

      // Build request entry
      const request = {
        id: store.getNextLeaveId(),
        employeeId,
        startDate: Utils.formatDate(start),
        endDate: Utils.formatDate(end),
        type,
        comment,
        status: 'pending',
        submittedAt: Utils.nowISO(),
        decidedBy: null,
        decidedAt: null
      };
      store.leaveRequests.push(request);

      // If any failing date -> auto-reject
      if (failingDates.length > 0) {
        request.status = 'rejected';
        request.decidedAt = Utils.nowISO();
        request.decidedBy = null; // auto-decision
        alertManager.pushAlert('warning', 'Leave Rejected', `Leave request #${request.id} rejected: ${failingDates.map(f => `${f.date} (${f.reason})`).join('; ')}`);
        return { success: false, request, failingDates };
      }

      // Auto-approve if passes checks (manager action could override)
      request.status = 'approved';
      request.decidedAt = Utils.nowISO();
      request.decidedBy = 'system';
      // Record absences per day (avoid duplicates)
      for (const dt of dates) {
        const exists = store.absences.some(a => a.employeeId === employeeId && a.date === dt);
        if (!exists) {
          store.absences.push({ employeeId, date: dt, reason: type, createdAt: Utils.nowISO() });
        }
      }

      alertManager.pushAlert('success', 'Leave Approved', `Leave request #${request.id} automatically approved.`);
      return { success: true, request };
    }

    // Manager-only approve
    async function approveLeave(requestId, managerId) {
      const request = store.leaveRequests.find(r => r.id === requestId);
      if (!request) return { success: false, reason: 'REQUEST_NOT_FOUND' };
      if (request.status === 'approved') return { success: false, reason: 'ALREADY_APPROVED' };

      // Compute dates and check coverage again (in case other approvals changed state)
      const dates = Utils.rangeDates(request.startDate, request.endDate);
      const failingDates = [];
      const employee = store.employees.find(e => e.id === request.employeeId);
      const pharmacists = store.employees.filter(e => e.role === 'pharmacist' && e.diploma);

      for (const dt of dates) {
        const absCount = store.absences.filter(a => a.date === dt).length;
        const availableAfter = store.employees.length - (absCount + 1);
        if (availableAfter < Defaults.minEmployeesPresent) {
          failingDates.push({ date: dt, reason: `Insufficient coverage: ${availableAfter} present if approved` });
          continue;
        }

        const pharmAbs = store.absences.filter(a => a.date === dt && pharmacists.some(p => p.id === a.employeeId)).length;
        const requesterIsPharmacist = employee.role === 'pharmacist' && employee.diploma;
        const pharmacistsAfter = pharmacists.length - (pharmAbs + (requesterIsPharmacist ? 1 : 0));
        if (pharmacistsAfter < Defaults.minPharmacistPerDay) {
          failingDates.push({ date: dt, reason: `Pharmacist coverage would be < ${Defaults.minPharmacistPerDay}` });
        }
      }

      if (failingDates.length > 0) {
        request.status = 'rejected';
        request.decidedBy = managerId || 'manager';
        request.decidedAt = Utils.nowISO();
        alertManager.pushAlert('warning', 'Leave Rejected', `Manager rejected leave request #${request.id}: ${failingDates.map(f => `${f.date} (${f.reason})`).join('; ')}`);
        return { success: false, request, failingDates };
      }

      // Approve and record absences
      request.status = 'approved';
      request.decidedBy = managerId || 'manager';
      request.decidedAt = Utils.nowISO();
      for (const dt of dates) {
        if (!store.absences.some(a => a.employeeId === request.employeeId && a.date === dt)) {
          store.absences.push({ employeeId: request.employeeId, date: dt, reason: request.type, createdAt: Utils.nowISO() });
        }
      }

      alertManager.pushAlert('success', 'Leave Approved', `Manager approved leave request #${request.id}.`);
      return { success: true, request };
    }

    // Manager-only reject
    async function rejectLeave(requestId, managerId, reason = '') {
      const request = store.leaveRequests.find(r => r.id === requestId);
      if (!request) return { success: false, reason: 'REQUEST_NOT_FOUND' };
      if (request.status === 'approved') return { success: false, reason: 'ALREADY_APPROVED' };

      request.status = 'rejected';
      request.decidedBy = managerId || 'manager';
      request.decidedAt = Utils.nowISO();
      alertManager.pushAlert('info', 'Leave Rejected', `Manager rejected leave request #${request.id}. ${reason}`);
      return { success: true, request };
    }

    return { submitLeaveRequest, approveLeave, rejectLeave, countAbsencesOnDate };
  }

  // ---------- Scheduler ----------
  function createScheduler(store, config = Defaults, alertManager) {
    /*
      Responsibilities:
      - generateSchedule(weekStartOrLabel, activityLevel) -> returns array of shifts
      - validateSchedule(schedule) -> { passed, violations }
      Approach:
      - For each day (Mon-Sat), for each shift, pick required staff:
        - Ensure 1 pharmacist with diploma per shift
        - Respect employees unavailable due to store.absences
        - Respect max hours per day and weekly contract hours
      - Basic greedy assignment balancing total assigned hours.
    */
    function isEmployeeAvailable(employeeId, dateStr) {
      return !store.absences.some(a => a.employeeId === employeeId && a.date === dateStr);
    }

    function computeAssignedHours(employeeId, schedule) {
      // compute hours for the schedule passed
      const entries = schedule.flatMap(s => s.staff.map(emp => ({ empId: emp.id, hours: s.totalHours })));
      return entries.filter(e => e.empId === employeeId).reduce((sum, x) => sum + x.hours, 0);
    }

    function generateSchedule(weekStart = null, activityLevel = 'normal') {
      // weekStart param is informational; we generate for a 6-day work week (Mon-Sat)
      const weekDays = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
      const schedule = [];

      const staffPerShift = config.activityStaffMap[activityLevel] || config.activityStaffMap.normal;

      // prepare employees pool
      const allEmployees = [...store.employees];

      // For fairness track hours assigned in this generation
      const assignedHours = {};
      allEmployees.forEach(e => assignedHours[e.id] = 0);

      // For each day & shift select staff
      for (const day of weekDays) {
        for (const shift of config.shiftsPerDay) {
          // target: staffPerShift people with at least 1 pharmacist
          // filter available employees by no absence on that (assume weekStart isn't mapped to specific date; if weekStart provided as ISO date we can check store.absences)
          const dateStr = null; // if user wants calendar-aware scheduling, they can pass dates; for MVP keep generic
          // Prioritize pharmacists to ensure coverage
          const pharmacists = allEmployees.filter(e => e.role === 'pharmacist' && e.diploma);
          const nonPharmacists = allEmployees.filter(e => e.role !== 'pharmacist');

          // Greedy: pick lowest assigned hours employees, respecting daily and weekly hours when date-aware
          const comparator = (a, b) => assignedHours[a.id] - assignedHours[b.id];

          // sort pools
          pharmacists.sort(comparator);
          nonPharmacists.sort(comparator);

          const assigned = [];

          // pick pharmacist
          if (pharmacists.length > 0) {
            assigned.push(pharmacists.shift());
          } else {
            // no pharmacist available -> we will create shift without pharmacist (validation will flag)
          }

          // pick remaining staff
          const remaining = staffPerShift - assigned.length;
          const combined = [...pharmacists, ...nonPharmacists].sort(comparator);
          for (let i = 0; i < remaining && i < combined.length; i++) {
            assigned.push(combined[i]);
          }

          // assign hours
          for (const emp of assigned) {
            assignedHours[emp.id] = (assignedHours[emp.id] || 0) + config.shiftHours;
          }

          schedule.push({
            day,
            shift,
            hours: `${config.shiftHours}h`,
            totalHours: config.shiftHours,
            staff: assigned.map(e => ({ id: e.id, name: e.name, role: e.role, maxHours: e.maxHours })),
            pharmacistPresent: assigned.some(e => e.role === 'pharmacist' && e.diploma),
          });
        }
      }

      // store schedule
      store.currentSchedule.splice(0, store.currentSchedule.length, ...schedule);
      // produce validation and alerts if needed
      const validation = validateSchedule(schedule);
      if (!validation.passed) {
        alertManager.pushAlert('warning', 'Schedule Issues', `Schedule generated with ${validation.violations.length} violation(s).`);
      } else {
        alertManager.pushAlert('success', 'Schedule Generated', 'Weekly schedule generated and validated.');
      }

      return { schedule, validation };
    }

    // Validate schedule
    function validateSchedule(schedule) {
      const violations = [];
      // 1) Pharmacist present per shift
      schedule.forEach(s => {
        if (!s.pharmacistPresent) {
          violations.push({ type: 'pharmacist_missing', title: 'Pharmacist Missing', message: `No pharmacist present on ${s.day} ${s.shift}` });
        }
        if (!s.staff || s.staff.length < 1) {
          violations.push({ type: 'understaffed', title: 'Understaffed Shift', message: `Shift ${s.day} ${s.shift} has ${s.staff.length} staff` });
        }
      });

      // 2) Hours constraints per day/employee
      const dailyByEmployee = {};
      schedule.forEach(s => {
        const day = s.day;
        s.staff.forEach(emp => {
          const key = `${emp.id}_${day}`;
          dailyByEmployee[key] = (dailyByEmployee[key] || 0) + s.totalHours;
        });
      });
      Object.entries(dailyByEmployee).forEach(([k, hours]) => {
        if (hours > Defaults.maxHoursPerDay) {
          const [empId, day] = k.split('_');
          const emp = store.employees.find(e => e.id === parseInt(empId, 10));
          violations.push({ type: 'max_hours_day', title: 'Max Hours Day', message: `${emp?.name || 'Employee'} has ${hours}h on ${day}` });
        }
      });

      // 3) Weekly hours vs contract
      const weeklyHours = {};
      schedule.forEach(s => {
        s.staff.forEach(emp => {
          weeklyHours[emp.id] = (weeklyHours[emp.id] || 0) + s.totalHours;
        });
      });
      Object.entries(weeklyHours).forEach(([id, hours]) => {
        const emp = store.employees.find(e => e.id === parseInt(id, 10));
        if (emp && hours > emp.maxHours) {
          violations.push({ type: 'weekly_hours_exceeded', title: 'Weekly Hours Exceeded', message: `${emp.name} assigned ${hours}h (max ${emp.maxHours})` });
        }
      });

      return { passed: violations.length === 0, violations };
    }

    return { generateSchedule, validateSchedule, computeAssignedHours };
  }

  // ---------- Surcharge & Activity Analysis ----------
  function createAnalyzer(store, config = Defaults) {
    function analyzeSurcharge(ordonnancesPerDay, employeesPresent) {
      // ratio = ordonnancesPerDay / employeesPresent
      const ratio = employeesPresent > 0 ? ordonnancesPerDay / employeesPresent : Infinity;
      let classification, recommendations = [];
      if (ordonnancesPerDay <= 120) {
        classification = 'Normal';
        recommendations.push({ action: 'none', reason: 'Activity within normal range' });
      } else if (ordonnancesPerDay <= 180) {
        classification = 'Attention';
        recommendations.push({ action: 'add_staff', reason: 'Consider adding 1-2 staff during peak hours' });
        recommendations.push({ action: 'extend_hours', reason: 'Consider limited extension of hours' });
      } else {
        classification = 'Critical';
        recommendations.push({ action: 'add_staff_immediate', reason: 'Add staff immediately (temps partiel / intérim)' });
        recommendations.push({ action: 'prioritize', reason: 'Prioritize urgent ordonnances' });
        recommendations.push({ action: 'contact', reason: 'Contact external resources' });
      }

      return {
        ordonnancesPerDay,
        employeesPresent,
        ratio: Number(ratio.toFixed(2)),
        classification,
        recommendations,
        timestamp: Utils.nowISO()
      };
    }

    return { analyzeSurcharge };
  }

  // ---------- Public Factory ----------
  function createAgent(options = {}) {
    const store = createStore(options);
    const alertManager = createAlertManager(store);
    const leaveManager = createLeaveManager(store, Defaults, alertManager);
    const scheduler = createScheduler(store, Defaults, alertManager);
    const analyzer = createAnalyzer(store, Defaults);

    // Expose required functions and data structures
    return {
      // Data
      store,
      config: Defaults,

      // Alerts
      triggerManagerAlert: alertManager.triggerManagerAlert,
      displayAlerts: alertManager.displayAlerts,
      pushAlert: alertManager.pushAlert,

      // Leave management
      submitLeaveRequest: leaveManager.submitLeaveRequest,
      approveLeave: leaveManager.approveLeave,
      rejectLeave: leaveManager.rejectLeave,

      // Scheduling
      generateSchedule: scheduler.generateSchedule,
      validateSchedule: scheduler.validateSchedule,
      computeAssignedHours: scheduler.computeAssignedHours,

      // Analysis
      analyzeSurcharge: analyzer.analyzeSurcharge,

      // Utility helpers
      utils: Utils,

      // Lightweight admin functions for testing / UI integration
      listEmployees() { return store.employees; },
      listLeaves() { return store.leaveRequests; },
      listAbsences() { return store.absences; },
      listSchedule() { return store.currentSchedule; },
      listAlerts() { return store.currentAlerts; },
      listNotifications() { return store.notifications; },

      // A small method to set current user and enforce manager-only actions in UI
      currentContext: {
        currentUserId: options.currentUserId || null,
        currentUserRole: options.currentUserRole || 'employee'
      },

      // Convenience wrapper that enforces manager-only operations
      managerApprove(requestId) {
        if (this.currentContext.currentUserRole !== 'manager') {
          throw new Error('Only managers can approve leaves.');
        }
        return this.approveLeave(requestId, this.currentContext.currentUserId);
      },
      managerReject(requestId, reason = '') {
        if (this.currentContext.currentUserRole !== 'manager') {
          throw new Error('Only managers can reject leaves.');
        }
        return this.rejectLeave(requestId, this.currentContext.currentUserId, reason);
      },
      managerGenerateSchedule(week, activityLevel) {
        if (this.currentContext.currentUserRole !== 'manager') {
          throw new Error('Only managers can generate schedules.');
        }
        return this.generateSchedule(week, activityLevel);
      }
    };
  }

  // Expose creator
  return { create: createAgent };
})();

// Export for Node / ES modules compatibility
// In a bundler or browser you can import DecisionAgent above; for Node:
// module.exports = DecisionAgent;
export default DecisionAgent;
