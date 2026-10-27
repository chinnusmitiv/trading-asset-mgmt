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

    case 'investors.update':
    case 'investor.update':
      assertPermission(user, 'CREATE_INVESTOR');
      var invId = payload.investorId;
      var rawInvFields = payload.fields || {};
      var invUpdate = {};
      if (rawInvFields.name !== undefined) invUpdate.name = rawInvFields.name;
      if (rawInvFields.phone !== undefined) invUpdate.phone = rawInvFields.phone;
      if (rawInvFields.email !== undefined) invUpdate.email = rawInvFields.email;
      if (rawInvFields.address !== undefined) invUpdate.address = rawInvFields.address;
      if (rawInvFields.status !== undefined) invUpdate.status = rawInvFields.status;
      if (rawInvFields.notes !== undefined) invUpdate.notes = rawInvFields.notes;
      invUpdate.updated_at = new Date().toISOString();

      var updatedInvestor = updateRow(SHEET_NAMES.INVESTORS, 'investor_id', invId, invUpdate);
      logAuditEvent(user.user_id, 'INVESTOR_UPDATED', 'Investors', invId, null, invUpdate, 'Updated investor profile');
      return updatedInvestor;

    case 'investments.create':
    case 'investment.create':
      assertPermission(user, 'CREATE_INVESTOR');
      var newInvTrancheId = generateNextId(SHEET_NAMES.INVESTMENTS, 'investment_id', 'INV-TRANCHE-');
      var principal = Number(payload.principalAmount || 0);
      var returnPct = Number(payload.returnPercentage || 0);
      var monthlyRet = Number(payload.monthlyReturn || (principal * (returnPct / 100)));
      var trancheRecord = {
        investment_id: newInvTrancheId,
        investor_id: payload.investorId,
        principal_amount: principal,
        investment_date: payload.investmentDate || new Date().toISOString().split('T')[0],
        maturity_date: payload.maturityDate || '',
        return_percentage: returnPct,
        monthly_return: monthlyRet,
        payment_frequency: payload.paymentFrequency || 'Monthly',
        policy_id: payload.policyId || '',
        status: payload.status || 'Active',
        notes: payload.notes || '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        created_by: user.user_id
      };
      appendRow(SHEET_NAMES.INVESTMENTS, trancheRecord);
      logAuditEvent(user.user_id, 'INVESTMENT_CREATED', 'Investors', newInvTrancheId, null, trancheRecord, 'Created investment tranche');
      return trancheRecord;

    case 'investments.update':
    case 'investment.update':
      assertPermission(user, 'CREATE_INVESTOR');
      var trancheFields = {};
      var rawFields = payload.fields || {};
      if (rawFields.principalAmount !== undefined) trancheFields.principal_amount = Number(rawFields.principalAmount);
      if (rawFields.returnPercentage !== undefined) trancheFields.return_percentage = Number(rawFields.returnPercentage);
      if (rawFields.monthlyReturn !== undefined) trancheFields.monthly_return = Number(rawFields.monthlyReturn);
      if (rawFields.paymentFrequency !== undefined) trancheFields.payment_frequency = rawFields.paymentFrequency;
      if (rawFields.maturityDate !== undefined) trancheFields.maturity_date = rawFields.maturityDate;
      if (rawFields.status !== undefined) trancheFields.status = rawFields.status;
      if (rawFields.notes !== undefined) trancheFields.notes = rawFields.notes;
      trancheFields.updated_at = new Date().toISOString();

      var updatedTranche = updateRow(SHEET_NAMES.INVESTMENTS, 'investment_id', payload.investmentId, trancheFields);
      logAuditEvent(user.user_id, 'INVESTMENT_UPDATED', 'Investors', payload.investmentId, null, trancheFields, 'Updated investment tranche');
      return updatedTranche;

    case 'bank.create':
    case 'investors.bank.create':
      assertPermission(user, 'CREATE_INVESTOR');
      var newBankId = generateNextId(SHEET_NAMES.INVESTOR_BANK, 'bank_id', 'BNK-');
      var bankRecord = {
        bank_id: newBankId,
        investor_id: payload.investorId,
        account_holder_name: payload.accountHolderName || '',
        bank_name: payload.bankName || '',
        account_number_masked: payload.accountNumberMasked || (payload.accountNumber ? ('XXXX XXXX ' + String(payload.accountNumber).slice(-4)) : 'XXXX'),
        ifsc_code: payload.ifscCode || '',
        account_type: payload.accountType || 'Savings',
        is_primary: payload.isPrimary !== undefined ? payload.isPrimary : true,
        created_at: new Date().toISOString()
      };
      appendRow(SHEET_NAMES.INVESTOR_BANK, bankRecord);
      logAuditEvent(user.user_id, 'BANK_ADDED', 'Investors', newBankId, null, bankRecord, 'Added investor bank account');
      return bankRecord;

    case 'bank.update':
    case 'investors.bank.update':
      assertPermission(user, 'CREATE_INVESTOR');
      var bankUpdateFields = {};
      var bFields = payload.fields || {};
      if (bFields.accountHolderName !== undefined) bankUpdateFields.account_holder_name = bFields.accountHolderName;
      if (bFields.bankName !== undefined) bankUpdateFields.bank_name = bFields.bankName;
      if (bFields.accountNumberMasked !== undefined) bankUpdateFields.account_number_masked = bFields.accountNumberMasked;
      if (bFields.ifscCode !== undefined) bankUpdateFields.ifsc_code = bFields.ifscCode;
      if (bFields.accountType !== undefined) bankUpdateFields.account_type = bFields.accountType;
      if (bFields.isPrimary !== undefined) bankUpdateFields.is_primary = bFields.isPrimary;
      var updatedBank = updateRow(SHEET_NAMES.INVESTOR_BANK, 'bank_id', payload.bankId, bankUpdateFields);
      logAuditEvent(user.user_id, 'BANK_UPDATED', 'Investors', payload.bankId, null, bankUpdateFields, 'Updated investor bank details');
      return updatedBank;

    case 'payments.create':
    case 'payment.create':
      assertPermission(user, 'RECORD_PAYMENT');
      var newPayId = generateNextId(SHEET_NAMES.INVESTOR_PAYMENTS, 'payment_id', 'PAY-');
      var payRecord = {
        payment_id: newPayId,
        investor_id: payload.investorId,
        investment_id: payload.investmentId,
        payment_date: payload.paymentDate || new Date().toISOString().split('T')[0],
        payment_month: payload.paymentMonth || new Date().toISOString().slice(0, 7),
        principal_amount: Number(payload.principalAmount || 0),
        profit_amount: Number(payload.profitAmount || 0),
        other_amount: Number(payload.otherAmount || 0),
        total_amount: Number(payload.totalAmount || 0),
        payment_method: payload.paymentMethod || 'Bank_Transfer',
        payment_reference: payload.paymentReference || '',
        status: payload.status || 'Pending',
        notes: payload.notes || '',
        created_at: new Date().toISOString(),
        created_by: user.user_id
      };
      appendRow(SHEET_NAMES.INVESTOR_PAYMENTS, payRecord);
      logAuditEvent(user.user_id, 'PAYMENT_RECORDED', 'Finance', newPayId, null, payRecord, 'Recorded investor disbursement payment');
      return payRecord;

    case 'payments.markPaid':
    case 'payment.markPaid':
    case 'payments.update':
    case 'payment.update':
      assertPermission(user, 'APPROVE_PAYMENT');
      var payFields = {
        status: payload.status || 'Paid'
      };
      if (payload.paymentReference) payFields.payment_reference = payload.paymentReference;
      var updatedPayment = updateRow(SHEET_NAMES.INVESTOR_PAYMENTS, 'payment_id', payload.paymentId, payFields);
      logAuditEvent(user.user_id, 'PAYMENT_STATUS_UPDATED', 'Finance', payload.paymentId, null, payFields, 'Updated payment status to ' + (payload.status || 'Paid'));
      return updatedPayment;

    case 'payments.reverse':
    case 'payment.reverse':
      assertPermission(user, 'APPROVE_PAYMENT');
      var revFields = {
        status: 'Reversed',
        notes: payload.reason ? ('Reversed: ' + payload.reason) : 'Reversed'
      };
      var reversedPayment = updateRow(SHEET_NAMES.INVESTOR_PAYMENTS, 'payment_id', payload.paymentId, revFields);
      logAuditEvent(user.user_id, 'PAYMENT_REVERSED', 'Finance', payload.paymentId, null, revFields, 'Reversed payment: ' + (payload.reason || ''));
      return reversedPayment;

    case 'payments.uploadReceipt':
    case 'receipts.upload':
    case 'receipts.generateDriveLink':
      assertPermission(user, 'RECORD_PAYMENT');
      var folderName = 'Vantara_Disbursement_Receipts';
      var folders = DriveApp.getFoldersByName(folderName);
      var folder = folders.hasNext() ? folders.next() : DriveApp.createFolder(folderName);

      var fileName = payload.fileName || ('Vantara_Receipt_' + (payload.paymentId || 'VOUCHER') + '.pdf');
      var blob;

      if (payload.pdfBase64) {
        var bytes = Utilities.base64Decode(payload.pdfBase64);
        blob = Utilities.newBlob(bytes, 'application/pdf', fileName);
      } else if (payload.htmlContent) {
        blob = Utilities.newBlob(payload.htmlContent, 'text/html', fileName.replace('.pdf', '.html')).getAs('application/pdf');
        blob.setName(fileName);
      } else {
        throw new Error('No PDF base64 or HTML content provided for receipt upload');
      }

      var file = folder.createFile(blob);
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      var fileId = file.getId();
      var driveUrl = 'https://drive.google.com/file/d/' + fileId + '/view?usp=sharing';

      // Record in Investor_Documents sheet
      var docId = generateNextId(SHEET_NAMES.INVESTOR_DOCUMENTS, 'document_id', 'DOC-');
      var docRecord = {
        document_id: docId,
        entity_type: 'Investor',
        entity_id: payload.investorId || '',
        document_type: 'Other',
        document_name: fileName,
        drive_file_id: fileId,
        drive_url: driveUrl,
        uploaded_date: new Date().toISOString().split('T')[0],
        status: 'Valid',
        created_by: user.user_id
      };
      appendRow(SHEET_NAMES.INVESTOR_DOCUMENTS, docRecord);

      // Attempt to update Investor_Payments if column exists
      if (payload.paymentId) {
        try {
          updateRow(SHEET_NAMES.INVESTOR_PAYMENTS, 'payment_id', payload.paymentId, {
            receipt_url: driveUrl
          });
        } catch (e) {
          // If receipt_url column does not exist yet, continue safely
        }
      }

      logAuditEvent(user.user_id, 'RECEIPT_UPLOADED', 'Finance', payload.paymentId || docId, null, { driveUrl: driveUrl }, 'Uploaded disbursement receipt to Google Drive');

      return {
        driveUrl: driveUrl,
        fileId: fileId,
        documentId: docId
      };

    case 'payments.reminders':
      assertPermission(user, 'VIEW_INVESTORS');
      var targetMonth = payload && payload.month ? payload.month : new Date().toISOString().slice(0, 7);
      var todayIso = new Date().toISOString().split('T')[0];
      var allInvestors = readRows(SHEET_NAMES.INVESTORS);
      var allInvestments = readRows(SHEET_NAMES.INVESTMENTS);
      var allPayments = readRows(SHEET_NAMES.INVESTOR_PAYMENTS);
      var allBanks = readRows(SHEET_NAMES.INVESTOR_BANK);

      var reminders = [];
      allInvestments.forEach(function(inv) {
        if (inv.status !== 'Active') return;
        var investor = null;
        for (var i = 0; i < allInvestors.length; i++) {
          if (allInvestors[i].investor_id === inv.investor_id) {
            investor = allInvestors[i];
            break;
          }
        }
        if (!investor) return;

        var bank = null;
        for (var b = 0; b < allBanks.length; b++) {
          if (allBanks[b].investor_id === inv.investor_id) {
            bank = allBanks[b];
            if (bank.is_primary) break;
          }
        }

        var existingPayment = null;
        for (var p = 0; p < allPayments.length; p++) {
          if (allPayments[p].investment_id === inv.investment_id &&
              allPayments[p].payment_month === targetMonth &&
              allPayments[p].status === 'Paid') {
            existingPayment = allPayments[p];
            break;
          }
        }

        var cycleDay = 1;
        if (inv.investment_date) {
          var pDate = new Date(inv.investment_date);
          if (!isNaN(pDate.getTime())) {
            cycleDay = pDate.getDate();
          }
        }
        var yearParts = targetMonth.split('-');
        var y = parseInt(yearParts[0], 10);
        var m = parseInt(yearParts[1], 10);
        var maxDays = new Date(y, m, 0).getDate();
        var effectiveDay = Math.min(cycleDay, maxDays);
        var padD = ('0' + effectiveDay).slice(-2);
        var padM = ('0' + m).slice(-2);
        var dueDate = y + '-' + padM + '-' + padD;

        var todayTime = new Date(todayIso + 'T00:00:00Z').getTime();
        var dueDateTime = new Date(dueDate + 'T00:00:00Z').getTime();
        var diffDays = Math.round((todayTime - dueDateTime) / (1000 * 60 * 60 * 24));

        var status = 'Upcoming';
        var statusLabel = 'Due in ' + Math.abs(diffDays) + ' days';
        if (existingPayment) {
          status = 'Paid';
          statusLabel = 'Paid on ' + existingPayment.payment_date;
        } else if (diffDays > 0) {
          status = 'Overdue';
          statusLabel = 'Overdue by ' + diffDays + ' day' + (diffDays > 1 ? 's' : '');
        } else if (diffDays === 0) {
          status = 'Due_Today';
          statusLabel = 'Due Today';
        }

        reminders.push({
          investmentId: inv.investment_id,
          investorId: inv.investor_id,
          investorName: investor.name,
          investorPhone: investor.phone,
          principalAmount: Number(inv.principal_amount || 0),
          returnPercentage: Number(inv.return_percentage || 0),
          monthlyReturnExpected: Number(inv.monthly_return || 0),
          paymentFrequency: inv.payment_frequency || 'Monthly',
          investmentDate: inv.investment_date,
          cycleDay: effectiveDay,
          dueDate: dueDate,
          status: status,
          daysDifference: diffDays,
          statusLabel: statusLabel,
          paidAmount: existingPayment ? Number(existingPayment.total_amount || 0) : undefined,
          paymentId: existingPayment ? existingPayment.payment_id : undefined,
          paymentDate: existingPayment ? existingPayment.payment_date : undefined,
          bankName: bank ? bank.bank_name : undefined,
          accountNumberMasked: bank ? bank.account_number_masked : undefined
        });
      });

      var statusPriority = { Overdue: 1, Due_Today: 2, Upcoming: 3, Paid: 4 };
      reminders.sort(function(a, b) {
        var pDiff = (statusPriority[a.status] || 99) - (statusPriority[b.status] || 99);
        if (pDiff !== 0) return pDiff;
        if (a.status === 'Overdue') return b.daysDifference - a.daysDifference;
        if (a.status === 'Upcoming') return b.daysDifference - a.daysDifference;
        return a.cycleDay - b.cycleDay;
      });

      return reminders;

    case 'documents.list':
      assertPermission(user, 'VIEW_INVESTORS');
      var allDocs = readRows(SHEET_NAMES.INVESTOR_DOCUMENTS);
      if (payload && payload.entityId) {
        return allDocs.filter(function(d) { return d.entity_id === payload.entityId; });
      }
      return allDocs;

    case 'documents.create':
      assertPermission(user, 'EDIT_INVESTOR');
      var newDocId = generateNextId(SHEET_NAMES.INVESTOR_DOCUMENTS, 'document_id', 'DOC-');
      var newDoc = {
        document_id: newDocId,
        entity_type: payload.entityType || 'Investor',
        entity_id: payload.entityId || '',
        document_type: payload.documentType || 'Other',
        document_name: payload.documentName || '',
        drive_file_id: payload.driveFileId || '',
        drive_url: payload.driveUrl || '',
        uploaded_date: payload.uploadedDate || new Date().toISOString().split('T')[0],
        expiry_date: payload.expiryDate || '',
        status: payload.status || 'Valid',
        created_by: user.user_id
      };
      appendRow(SHEET_NAMES.INVESTOR_DOCUMENTS, newDoc);
      logAuditEvent(user.user_id, 'DOCUMENT_CREATED', 'Investors', newDocId, null, newDoc, 'Created document record');
      return newDoc;

    case 'documents.update':
      assertPermission(user, 'EDIT_INVESTOR');
      var updatedDoc = updateRow(SHEET_NAMES.INVESTOR_DOCUMENTS, 'document_id', payload.documentId, payload.fields || {});
      logAuditEvent(user.user_id, 'DOCUMENT_UPDATED', 'Investors', payload.documentId, null, payload.fields, 'Updated document');
      return updatedDoc;

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

    case 'staff.get':
      assertPermission(user, 'VIEW_STAFF');
      var staffMember = findByField(SHEET_NAMES.STAFF, 'staff_id', payload.staffId);
      if (!staffMember) throw new Error('Staff member not found: ' + payload.staffId);
      return staffMember;

    case 'staff.details':
      assertPermission(user, 'VIEW_STAFF');
      var member = findByField(SHEET_NAMES.STAFF, 'staff_id', payload.staffId);
      if (!member) throw new Error('Staff member not found: ' + payload.staffId);
      var allTrades = readRows(SHEET_NAMES.TRADES);
      var staffTrades = allTrades.filter(function(t) { return t.staff_id === payload.staffId; });
      var allCommissions = readRows(SHEET_NAMES.STAFF_COMMISSIONS);
      var staffCommissions = allCommissions.filter(function(c) { return c.staff_id === payload.staffId; });

      var totalNetPnL = 0;
      var totalStaffShare = 0;
      var totalCompanyShare = 0;
      var winningTrades = 0;

      staffTrades.forEach(function(t) {
        var pnl = Number(t.net_pnl || 0);
        var staffShare = Number(t.staff_share || 0);
        var companyShare = Number(t.company_share || 0);
        totalNetPnL += pnl;
        totalStaffShare += staffShare;
        totalCompanyShare += companyShare;
        if (pnl > 0) winningTrades++;
      });

      var winRate = staffTrades.length > 0 ? (winningTrades / staffTrades.length) * 100 : 0;

      var staffBanks = [];
      var ss = getSpreadsheet();
      var staffBankSheet = ss.getSheetByName('Staff_Bank');
      if (staffBankSheet) {
        staffBanks = readRows('Staff_Bank').filter(function(b) { return b.staff_id === payload.staffId; });
      }
      var primaryBank = staffBanks.length > 0 ? (staffBanks.filter(function(b) { return b.is_primary === 'TRUE' || b.is_primary === true; })[0] || staffBanks[0]) : null;

      return {
        staff: member,
        trades: staffTrades,
        commissions: staffCommissions,
        banks: staffBanks,
        bank: primaryBank,
        metrics: {
          totalTrades: staffTrades.length,
          winningTrades: winningTrades,
          winRate: winRate,
          totalNetPnL: totalNetPnL,
          totalStaffShare: totalStaffShare,
          totalCompanyShare: totalCompanyShare
        }
      };

    case 'staff.update':
      assertPermission(user, 'CREATE_STAFF');
      var updatedFields = {};
      if (payload.fields) {
        if (payload.fields.name !== undefined) updatedFields.name = payload.fields.name;
        if (payload.fields.phone !== undefined) updatedFields.phone = payload.fields.phone;
        if (payload.fields.email !== undefined) updatedFields.email = payload.fields.email;
        if (payload.fields.role !== undefined) updatedFields.role = payload.fields.role;
        if (payload.fields.department !== undefined) updatedFields.department = payload.fields.department;
        if (payload.fields.tradingPercentage !== undefined) updatedFields.trading_percentage = payload.fields.tradingPercentage;
        if (payload.fields.basicSalary !== undefined) updatedFields.basic_salary = payload.fields.basicSalary;
        if (payload.fields.status !== undefined) updatedFields.status = payload.fields.status;
        updatedFields.updated_at = new Date().toISOString();
      }
      var updatedStaff = updateRow(SHEET_NAMES.STAFF, 'staff_id', payload.staffId, updatedFields);
      logAuditEvent(user.user_id, 'STAFF_UPDATED', 'Staff', payload.staffId, null, updatedFields, 'Updated staff profile');
      return updatedStaff;

    case 'commissions.list':
      assertPermission(user, 'VIEW_STAFF');
      var allComms = readRows(SHEET_NAMES.STAFF_COMMISSIONS);
      if (payload && payload.staffId) {
        allComms = allComms.filter(function(c) { return c.staff_id === payload.staffId; });
      }
      if (payload && payload.period) {
        allComms = allComms.filter(function(c) { return c.commission_period === payload.period; });
      }
      return allComms;

    case 'staff.banks.list':
      assertPermission(user, 'VIEW_STAFF');
      var ss = getSpreadsheet();
      var staffBankSheet = ss.getSheetByName('Staff_Bank');
      if (!staffBankSheet) return [];
      var allStaffBanks = readRows('Staff_Bank');
      return allStaffBanks.filter(function(b) { return b.staff_id === payload.staffId; });

    case 'trades.get':
      assertPermission(user, 'VIEW_TRADES');
      var trade = findByField(SHEET_NAMES.TRADES, 'trade_id', payload.tradeId);
      if (!trade) throw new Error('Trade not found: ' + payload.tradeId);
      return trade;

    case 'trades.update':
      assertPermission(user, 'CREATE_TRADE');
      var trUpdate = {};
      if (payload.status) trUpdate.status = payload.status;
      if (payload.notes) trUpdate.notes = payload.notes;
      var updatedTrade = updateRow(SHEET_NAMES.TRADES, 'trade_id', payload.tradeId, trUpdate);
      logAuditEvent(user.user_id, 'TRADE_UPDATED', 'Trading', payload.tradeId, null, trUpdate, 'Updated trade status to ' + payload.status);
      return updatedTrade;

    case 'trades.settle':
      assertPermission(user, 'CREATE_TRADE');
      var tradeToSettle = findByField(SHEET_NAMES.TRADES, 'trade_id', payload.tradeId);
      if (!tradeToSettle) throw new Error('Trade not found: ' + payload.tradeId);
      updateRow(SHEET_NAMES.TRADES, 'trade_id', payload.tradeId, { status: 'Settled' });
      logAuditEvent(user.user_id, 'TRADE_SETTLED', 'Trading', payload.tradeId, null, { status: 'Settled' }, 'Settled trade');
      return { trade: tradeToSettle };

    case 'expenses.list':
      assertPermission(user, 'VIEW_EXPENSES');
      return readRows(SHEET_NAMES.EXPENSES);

    case 'expenses.get':
      assertPermission(user, 'VIEW_EXPENSES');
      var expense = findByField(SHEET_NAMES.EXPENSES, 'expense_id', payload.expenseId);
      if (!expense) throw new Error('Expense not found: ' + payload.expenseId);
      return expense;

    case 'expenses.create':
      assertPermission(user, 'SUBMIT_EXPENSE');
      var newExpId = generateNextId(SHEET_NAMES.EXPENSES, 'expense_id', 'EXP-');
      var expRecord = {
        expense_id: newExpId,
        expense_date: payload.expenseDate || new Date().toISOString().split('T')[0],
        category: payload.category || 'Office_Supplies',
        description: payload.description || '',
        amount: Number(payload.amount || 0),
        payment_method: payload.paymentMethod || 'Bank_Transfer',
        paid_by: payload.paidBy || user.user_id,
        vendor: payload.vendor || '',
        receipt_url: payload.receiptUrl || '',
        status: payload.status || 'Pending',
        notes: payload.notes || '',
        created_at: new Date().toISOString(),
        created_by: user.user_id,
        approved_at: '',
        approved_by: ''
      };
      appendRow(SHEET_NAMES.EXPENSES, expRecord);
      logAuditEvent(user.user_id, 'EXPENSE_CREATED', 'Finance', newExpId, null, expRecord, 'Logged expense');
      return expRecord;

    case 'expenses.update':
      assertPermission(user, 'SUBMIT_EXPENSE');
      var expUpdate = {};
      var eFields = payload.fields || {};
      if (eFields.description !== undefined) expUpdate.description = eFields.description;
      if (eFields.amount !== undefined) expUpdate.amount = Number(eFields.amount);
      if (eFields.category !== undefined) expUpdate.category = eFields.category;
      if (eFields.vendor !== undefined) expUpdate.vendor = eFields.vendor;
      if (eFields.status !== undefined) expUpdate.status = eFields.status;
      if (eFields.notes !== undefined) expUpdate.notes = eFields.notes;
      var updatedExp = updateRow(SHEET_NAMES.EXPENSES, 'expense_id', payload.expenseId, expUpdate);
      logAuditEvent(user.user_id, 'EXPENSE_UPDATED', 'Finance', payload.expenseId, null, expUpdate, 'Updated expense');
      return updatedExp;

    case 'expenses.approve':
      assertPermission(user, 'APPROVE_EXPENSE');
      var appExp = {
        status: payload.status || 'Approved',
        approved_at: new Date().toISOString(),
        approved_by: user.user_id
      };
      if (payload.paymentReference) appExp.notes = 'Ref: ' + payload.paymentReference;
      var approvedExp = updateRow(SHEET_NAMES.EXPENSES, 'expense_id', payload.expenseId, appExp);
      logAuditEvent(user.user_id, 'EXPENSE_STATUS_UPDATED', 'Finance', payload.expenseId, null, appExp, 'Updated expense status to ' + appExp.status);
      return approvedExp;

    case 'expenses.delete':
      assertPermission(user, 'APPROVE_EXPENSE');
      var delExp = updateRow(SHEET_NAMES.EXPENSES, 'expense_id', payload.expenseId, { status: 'Cancelled' });
      logAuditEvent(user.user_id, 'EXPENSE_DELETED', 'Finance', payload.expenseId, null, null, 'Cancelled expense');
      return delExp;

    case 'salaries.list':
      assertPermission(user, 'VIEW_SALARIES');
      var allSalaries = readRows(SHEET_NAMES.SALARIES);
      if (user.role === 'Staff' && user.staff_id) {
        return allSalaries.filter(function(s) { return s.staff_id === user.staff_id; });
      }
      return allSalaries;

    case 'salaries.get':
      assertPermission(user, 'VIEW_SALARIES');
      var salary = findByField(SHEET_NAMES.SALARIES, 'salary_id', payload.salaryId);
      if (!salary) throw new Error('Salary not found: ' + payload.salaryId);
      return salary;

    case 'salaries.create':
      assertPermission(user, 'APPROVE_EXPENSE');
      var newSalId = generateNextId(SHEET_NAMES.SALARIES, 'salary_id', 'SAL-');
      var basic = Number(payload.basicSalary || 0);
      var comm = Number(payload.commission || 0);
      var bonus = Number(payload.bonus || 0);
      var allowance = Number(payload.allowance || 0);
      var deduction = Number(payload.deduction || 0);
      var advance = Number(payload.advance || 0);
      var netSal = payload.netSalary !== undefined ? Number(payload.netSalary) : (basic + comm + bonus + allowance - deduction - advance);

      var salRecord = {
        salary_id: newSalId,
        staff_id: payload.staffId,
        salary_month: payload.salaryMonth || new Date().toISOString().slice(0, 7),
        basic_salary: basic,
        allowance: allowance,
        bonus: bonus,
        commission: comm,
        deduction: deduction,
        advance: advance,
        net_salary: netSal,
        payment_date: payload.paymentDate || new Date().toISOString().split('T')[0],
        payment_status: payload.paymentStatus || 'Pending',
        payment_reference: payload.paymentReference || '',
        notes: payload.notes || '',
        created_at: new Date().toISOString(),
        created_by: user.user_id,
        approved_at: '',
        approved_by: ''
      };
      appendRow(SHEET_NAMES.SALARIES, salRecord);
      logAuditEvent(user.user_id, 'SALARY_CREATED', 'Finance', newSalId, null, salRecord, 'Created salary slip');
      return salRecord;

    case 'salaries.update':
      assertPermission(user, 'APPROVE_EXPENSE');
      var salUpdate = {};
      var sFields = payload.fields || {};
      if (sFields.basicSalary !== undefined) salUpdate.basic_salary = Number(sFields.basicSalary);
      if (sFields.netSalary !== undefined) salUpdate.net_salary = Number(sFields.netSalary);
      if (sFields.paymentStatus !== undefined) salUpdate.payment_status = sFields.paymentStatus;
      if (sFields.paymentReference !== undefined) salUpdate.payment_reference = sFields.paymentReference;
      if (sFields.notes !== undefined) salUpdate.notes = sFields.notes;
      var updatedSal = updateRow(SHEET_NAMES.SALARIES, 'salary_id', payload.salaryId, salUpdate);
      logAuditEvent(user.user_id, 'SALARY_UPDATED', 'Finance', payload.salaryId, null, salUpdate, 'Updated salary slip');
      return updatedSal;

    case 'salaries.approve':
      assertPermission(user, 'APPROVE_EXPENSE');
      var appSal = {
        payment_status: payload.status || 'Paid',
        approved_at: new Date().toISOString(),
        approved_by: user.user_id
      };
      if (payload.paymentReference) appSal.payment_reference = payload.paymentReference;
      var approvedSal = updateRow(SHEET_NAMES.SALARIES, 'salary_id', payload.salaryId, appSal);
      logAuditEvent(user.user_id, 'SALARY_STATUS_UPDATED', 'Finance', payload.salaryId, null, appSal, 'Updated salary status to ' + appSal.payment_status);
      return approvedSal;

    case 'salaries.delete':
      assertPermission(user, 'APPROVE_EXPENSE');
      var delSal = updateRow(SHEET_NAMES.SALARIES, 'salary_id', payload.salaryId, { payment_status: 'Cancelled' });
      logAuditEvent(user.user_id, 'SALARY_DELETED', 'Finance', payload.salaryId, null, null, 'Cancelled salary slip');
      return delSal;

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
    Manager: [
      'VIEW_INVESTORS',
      'CREATE_INVESTOR',
      'EDIT_INVESTOR',
      'CREATE_INVESTMENT',
      'RECORD_PAYMENT',
      'APPROVE_PAYMENT',
      'VIEW_TRADES',
      'CREATE_TRADE',
      'VIEW_STAFF',
      'CREATE_STAFF',
      'VIEW_EXPENSES',
      'SUBMIT_EXPENSE',
      'APPROVE_EXPENSE'
    ],
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

  var currentMonth = period || new Date().toISOString().slice(0, 7);
  var activeInvestments = investments.filter(function(i) { return i.status === 'Active'; });
  var pendingDisbursements = activeInvestments.filter(function(inv) {
    for (var p = 0; p < payments.length; p++) {
      if (payments[p].investment_id === inv.investment_id &&
          payments[p].payment_month === currentMonth &&
          payments[p].status === 'Paid') {
        return false;
      }
    }
    return true;
  });
  var pendingCount = pendingDisbursements.length;

  var alerts = [];
  if (pendingCount > 0) {
    alerts.push({
      id: 'ALT-DUE-PAYOUTS',
      type: 'warning',
      title: '⚠️ ' + pendingCount + ' Investor disbursement' + (pendingCount > 1 ? 's' : '') + ' due for ' + currentMonth,
      actionRoute: 'PaymentReminders'
    });
  } else {
    alerts.push({
      id: 'ALT-1',
      type: 'info',
      title: 'All investor disbursements reconciled for ' + currentMonth,
      actionRoute: 'PaymentReminders'
    });
  }

  return {
    period: currentMonth,
    capital: {
      total: totalPrincipal,
      deployed: totalPrincipal * 0.65,
      available: totalPrincipal * 0.35,
      utilizationPercentage: 65.0
    },
    investors: {
      activeCount: activeInvestments.length,
      totalPrincipal: totalPrincipal,
      profitPaidMonth: totalMonthlyReturnExpected,
      pendingPaymentsCount: pendingCount
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
    alerts: alerts
  };
}

/**
 * Run this function ONCE in the Apps Script editor to authorize Google Drive permissions.
 *
 * Steps:
 * 1. Select 'authorizeDrivePermissions' from the toolbar function dropdown.
 * 2. Click 'Run' (▶).
 * 3. In the popup, click 'Review permissions'.
 * 4. Choose your Google Account.
 * 5. Click 'Advanced' -> Click 'Go to ... (unsafe)'.
 * 6. Click 'Allow'.
 * 7. Deploy a New Version: Deploy > Manage deployments > Edit > New version > Deploy.
 */
function authorizeDrivePermissions() {
  var folderName = 'Vantara_Disbursement_Receipts';
  var folders = DriveApp.getFoldersByName(folderName);
  var folder = folders.hasNext() ? folders.next() : DriveApp.createFolder(folderName);
  Logger.log('Google Drive authorized successfully! Folder ID: ' + folder.getId());
  return 'Google Drive authorized successfully! Folder ID: ' + folder.getId();
}
