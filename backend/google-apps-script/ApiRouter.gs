/**
 * ApiRouter.gs
 * Action Dispatcher and RBAC Security Gatekeeper
 */

function dispatchAction(action, payload, token, requestId) {
  if (!action) {
    throw new Error('Action parameter is required');
  }

  // 1. Public Endpoints
  if (action === 'auth.login') {
    return handleLogin(payload.username, payload.password);
  }

  // 2. Authenticate Session Token
  var user = authenticateToken(token);
  if (!user) {
    var authError = new Error('Authentication required');
    authError.name = 'UNAUTHORIZED';
    throw authError;
  }

  // 3. Route Handlers
  switch (action) {
    case 'auth.currentUser':
      return user;

    case 'dashboard.summary':
      return handleDashboardSummary(payload.period, user);

    case 'investors.list':
      assertPermission(user, 'VIEW_INVESTORS');
      return readRows(SHEET_NAMES.INVESTORS);

    case 'investors.get':
      assertPermission(user, 'VIEW_INVESTORS');
      var investor = findByField(SHEET_NAMES.INVESTORS, 'investor_id', payload.investorId);
      if (!investor) throw new Error('Investor not found');
      var tranches = readRows(SHEET_NAMES.INVESTMENTS).filter(function(i) { return i.investor_id === payload.investorId; });
      var payments = readRows(SHEET_NAMES.INVESTOR_PAYMENTS).filter(function(p) { return p.investor_id === payload.investorId; });
      var bank = findByField(SHEET_NAMES.INVESTOR_BANK, 'investor_id', payload.investorId);
      return { investor: investor, investments: tranches, payments: payments, bank: bank };

    case 'investors.create':
      assertPermission(user, 'CREATE_INVESTOR');
      var newInvId = generateNextId(SHEET_NAMES.INVESTORS, 'investor_id', 'INV-');
      var invRecord = {
        investor_id: newInvId,
        name: payload.name,
        phone: payload.phone,
        email: payload.email || '',
        address: payload.address || '',
        joining_date: payload.joiningDate || new Date().toISOString().split('T')[0],
        status: 'Active',
        notes: payload.notes || '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      appendRow(SHEET_NAMES.INVESTORS, invRecord);
      logAuditEvent(user.user_id, 'INVESTOR_CREATED', 'Investors', newInvId, null, invRecord, 'Created new investor');
      return invRecord;

    case 'trades.list':
      assertPermission(user, 'VIEW_TRADES');
      var allTrades = readRows(SHEET_NAMES.TRADES);
      if (user.role === 'Staff' && user.staff_id) {
        return allTrades.filter(function(t) { return t.staff_id === user.staff_id; });
      }
      return allTrades;

    case 'trades.create':
      assertPermission(user, 'CREATE_TRADE');
      var newTradeId = generateNextId(SHEET_NAMES.TRADES, 'trade_id', 'TRD-');
      var staffId = (user.role === 'Staff') ? user.staff_id : (payload.staffId || user.staff_id);
      
      // Calculate financial invariants
      var grossProfit = Number(payload.grossProfit || 0);
      var grossLoss = Number(payload.grossLoss || 0);
      var netPnL = grossProfit - grossLoss;
      var staff = findByField(SHEET_NAMES.STAFF, 'staff_id', staffId);
      var appliedPct = staff ? Number(staff.trading_percentage || 0) : 0;
      var staffShare = netPnL > 0 ? (netPnL * (appliedPct / 100)) : 0;
      var companyShare = netPnL - staffShare;
      var capitalUsed = Number(payload.capitalUsed || 1);
      var roiPct = (netPnL / capitalUsed) * 100;

      var tradeRecord = {
        trade_id: newTradeId,
        staff_id: staffId,
        trade_date: payload.tradeDate || new Date().toISOString().split('T')[0],
        asset: payload.asset,
        trade_type: payload.tradeType || 'INTRADAY',
        capital_used: capitalUsed,
        entry_price: Number(payload.entryPrice || 0),
        exit_price: Number(payload.exitPrice || 0),
        quantity: Number(payload.quantity || 1),
        gross_profit: grossProfit,
        gross_loss: grossLoss,
        net_pnl: netPnL,
        applied_percentage: appliedPct,
        staff_share: staffShare,
        company_share: companyShare,
        roi_percentage: roiPct,
        status: 'Submitted',
        notes: payload.notes || '',
        created_at: new Date().toISOString(),
        created_by: user.user_id
      };
      appendRow(SHEET_NAMES.TRADES, tradeRecord);
      logAuditEvent(user.user_id, 'TRADE_CREATED', 'Trading', newTradeId, null, tradeRecord, 'Submitted trade');
      return tradeRecord;

    case 'staff.list':
      assertPermission(user, 'VIEW_STAFF');
      return readRows(SHEET_NAMES.STAFF);

    case 'staff.create':
      assertPermission(user, 'CREATE_STAFF');
      var newStaffId = generateNextId(SHEET_NAMES.STAFF, 'staff_id', 'STAFF-');
      var staffRecord = {
        staff_id: newStaffId,
        name: payload.name,
        phone: payload.phone,
        email: payload.email || '',
        role: payload.role || 'Trader',
        department: payload.department || 'Prop Trading',
        joining_date: payload.joiningDate || new Date().toISOString().split('T')[0],
        basic_salary: Number(payload.basicSalary || 0),
        trading_percentage: Number(payload.tradingPercentage || 0),
        commission_percentage: Number(payload.commissionPercentage || 0),
        status: payload.status || 'Active',
        bank_details_reference: payload.bankDetailsReference || '',
        notes: payload.notes || '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      appendRow(SHEET_NAMES.STAFF, staffRecord);
      logAuditEvent(user.user_id, 'STAFF_CREATED', 'Staff', newStaffId, null, staffRecord, 'Created staff profile');

      var createdUser = null;
      if (payload.loginCredentials && payload.loginCredentials.username) {
        var existingUsers = readRows(SHEET_NAMES.USERS);
        var desiredUsername = String(payload.loginCredentials.username).trim().toLowerCase();
        for (var i = 0; i < existingUsers.length; i++) {
          if (String(existingUsers[i].username).toLowerCase() === desiredUsername) {
            throw new Error('Username "' + payload.loginCredentials.username + '" is already taken');
          }
        }

        var newUserId = generateNextId(SHEET_NAMES.USERS, 'user_id', 'USR-');
        var userRole = payload.loginCredentials.role || (payload.role === 'Manager' ? 'Manager' : 'Staff');
        var userRecord = {
          user_id: newUserId,
          username: desiredUsername,
          password_hash: payload.loginCredentials.password || 'Staff@123',
          full_name: payload.name,
          email: payload.email || (desiredUsername + '@assetmgmt.internal'),
          role: userRole,
          staff_id: newStaffId,
          status: 'Active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        appendRow(SHEET_NAMES.USERS, userRecord);
        logAuditEvent(user.user_id, 'USER_CREATED', 'Users', newUserId, null, { username: userRecord.username, role: userRecord.role, staff_id: newStaffId }, 'Created login user for staff');

        createdUser = {
          userId: userRecord.user_id,
          username: userRecord.username,
          fullName: userRecord.full_name,
          email: userRecord.email,
          role: userRecord.role,
          staffId: userRecord.staff_id,
          status: userRecord.status
        };
      }

      return {
        staffId: staffRecord.staff_id,
        name: staffRecord.name,
        phone: staffRecord.phone,
        email: staffRecord.email,
        role: staffRecord.role,
        department: staffRecord.department,
        joiningDate: staffRecord.joining_date,
        basicSalary: staffRecord.basic_salary,
        tradingPercentage: staffRecord.trading_percentage,
        commissionPercentage: staffRecord.commission_percentage,
        status: staffRecord.status,
        bankDetailsReference: staffRecord.bank_details_reference,
        notes: staffRecord.notes,
        createdAt: staffRecord.created_at,
        updatedAt: staffRecord.updated_at,
        user: createdUser
      };

    case 'expenses.list':
      assertPermission(user, 'VIEW_EXPENSES');
      return readRows(SHEET_NAMES.EXPENSES);

    case 'salaries.list':
      assertPermission(user, 'VIEW_SALARIES');
      var allSalaries = readRows(SHEET_NAMES.SALARIES);
      if (user.role === 'Staff' && user.staff_id) {
        return allSalaries.filter(function(s) { return s.staff_id === user.staff_id; });
      }
      return allSalaries;

    case 'audit.list':
      assertPermission(user, 'VIEW_AUDIT');
      return readRows(SHEET_NAMES.AUDIT_LOG);

    case 'settings.get':
      return readRows(SHEET_NAMES.SETTINGS);

    default:
      throw new Error('Unsupported action: ' + action);
  }
}

function handleLogin(username, password) {
  var users = readRows(SHEET_NAMES.USERS);
  var matchedUser = null;

  for (var i = 0; i < users.length; i++) {
    if (String(users[i].username).toLowerCase() === String(username).toLowerCase() && String(users[i].password_hash) === String(password)) {
      matchedUser = users[i];
      break;
    }
  }

  if (!matchedUser || matchedUser.status !== 'Active') {
    var err = new Error('Invalid username or password');
    err.name = 'INVALID_CREDENTIALS';
    throw err;
  }

  var token = 'tok_' + Utilities.getUuid();
  CacheService.getScriptCache().put('sess_' + token, JSON.stringify(matchedUser), 86400); // 24 hours

  return {
    token: token,
    user: {
      userId: matchedUser.user_id,
      username: matchedUser.username,
      fullName: matchedUser.full_name,
      email: matchedUser.email,
      role: matchedUser.role,
      staffId: matchedUser.staff_id
    }
  };
}

function authenticateToken(token) {
  if (!token) return null;
  var cached = CacheService.getScriptCache().get('sess_' + token);
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch (e) {
      return null;
    }
  }
  return null;
}

function assertPermission(user, permission) {
  var role = user.role;
  if (role === 'Admin') return true;

  var permissionsByRole = {
    Manager: ['VIEW_INVESTORS', 'CREATE_INVESTOR', 'VIEW_TRADES', 'CREATE_TRADE', 'VIEW_STAFF', 'CREATE_STAFF', 'VIEW_EXPENSES', 'SUBMIT_EXPENSE'],
    Staff: ['VIEW_TRADES', 'CREATE_TRADE', 'VIEW_SALARIES', 'SUBMIT_EXPENSE']
  };

  var allowed = permissionsByRole[role] || [];
  if (allowed.indexOf(permission) === -1) {
    var error = new Error('Forbidden: Insufficient permissions for ' + permission);
    error.name = 'FORBIDDEN_ACTION';
    throw error;
  }
  return true;
}

function handleDashboardSummary(period, user) {
  var investors = readRows(SHEET_NAMES.INVESTORS);
  var investments = readRows(SHEET_NAMES.INVESTMENTS);
  var trades = readRows(SHEET_NAMES.TRADES);
  var expenses = readRows(SHEET_NAMES.EXPENSES);
  var salaries = readRows(SHEET_NAMES.SALARIES);

  var totalPrincipal = 0;
  var totalMonthlyReturnExpected = 0;
  investments.forEach(function(inv) {
    if (inv.status === 'Active') {
      totalPrincipal += Number(inv.principal_amount || 0);
      totalMonthlyReturnExpected += Number(inv.monthly_return || 0);
    }
  });

  var tradingPnL = 0;
  var totalTrades = trades.length;
  var winningTrades = 0;
  trades.forEach(function(t) {
    var pnl = Number(t.net_pnl || 0);
    tradingPnL += pnl;
    if (pnl > 0) winningTrades++;
  });

  var totalExpenses = 0;
  expenses.forEach(function(e) {
    if (e.status === 'Paid' || e.status === 'Approved') {
      totalExpenses += Number(e.amount || 0);
    }
  });

  var totalSalaries = 0;
  salaries.forEach(function(s) {
    if (s.payment_status === 'Paid' || s.payment_status === 'Approved') {
      totalSalaries += Number(s.net_salary || 0);
    }
  });

  var netCompanyProfit = tradingPnL - (totalMonthlyReturnExpected + totalExpenses + totalSalaries);

  return {
    period: period || 'Current',
    capital: {
      total: totalPrincipal,
      deployed: totalPrincipal * 0.65,
      available: totalPrincipal * 0.35,
      utilizationPercentage: 65.0
    },
    investors: {
      activeCount: investors.filter(function(i) { return i.status === 'Active'; }).length,
      totalPrincipal: totalPrincipal,
      profitPaidMonth: totalMonthlyReturnExpected,
      pendingPaymentsCount: 0
    },
    trading: {
      monthlyPnL: tradingPnL,
      totalTrades: totalTrades,
      winningTrades: winningTrades,
      winRate: totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0
    },
    finance: {
      expensesMonth: totalExpenses,
      salariesMonth: totalSalaries,
      netCompanyProfit: netCompanyProfit
    },
    alerts: [
      { id: 'ALT-1', type: 'info', title: 'Operational system healthy', actionRoute: 'Dashboard' }
    ]
  };
}
