frappe.ui.form.on('Bulk Payment Tool', {
    refresh(frm) {
        // Set query for 'cf_code' in the 'items' table
        frm.set_query("cf_code", "items", function () {
            return {
                filters: {
                    "is_group": 0
                }
            };
        });


        // const hasPayments = frm.doc.payment && frm.doc.payment.length > 0;

        frm.set_query("company_bank_account", function () {
            return {
                filters: {
                    "is_company_account": 1
                }
            };
        });
    },

    download_csv: function(frm) {
        download_csv_function(frm);
    },

    // validate(frm) {
    //     if (frm.doc.items.length > 0) {
    //         frm.doc.items.forEach(element => {
    //             if (element.to_pay > element.outstanding) {
    //                 frappe.throw(`#Row ${element.idx} - Amount to Pay can not be greater than outstanding amount`)
    //             }
    //         });
    //     }
    // },

    get_outstanding(frm) {

        frm.set_value("status", "In Progress")

        frappe.call({
            method: "bulk_payment.bulk_payment.api.bulk_payment_outstanding", 
            args: {
                doc : frm.doc
            }
        }).then((response) => {
            if (response.message === "Success") {
                frm.set_value("status", "Success")
                frm.reload_doc();
            }
        }).catch((error) => {
            frappe.msgprint({
                title: __('Error'),
                message: __('An error occurred while fetching outstanding payments.'),
                indicator: 'red'
            });

            frm.set_value("status", "Error")
            console.error(error);
        });
    },

    process_payments: function(frm) {
        set_payment_details(frm);
    },

});


function set_payment_details(frm) {
    frm.clear_table('payment');
    frm.doc.items.forEach(i => {
        if (i.to_pay !== 0) {
        
            let existing_row = frm.doc.payment.find(r => r.party === i.party);
            if (existing_row) {
                existing_row.amount_to_pay = existing_row.amount_to_pay + i.to_pay;
            } else {
                let row = frm.add_child('payment');
                row.party = i.party;
                row.posting_date = frm.doc.payment_posting_date;
                row.amount_to_pay = i.to_pay;
                row.mode_of_payment = frm.doc.mode_of_payment;
                row.party_account = i.party_account;
                row.cheque_reference_no = i.cheque_reference_no;
                row.branch = i.branch;
                row.cf_code = i.cf_code;
                row.voucher_type = i.voucher_type;
            }
        }        
    });
    frm.refresh_field('payment');
}

function download_csv_function(frm) {
    const payment_entries = frm.doc.payment || [];


    if (!payment_entries.length) {
        frappe.msgprint(__('No payment entries to download.'));
        return;
    }

    let csv_data = 'Party,Voucher Type,Posting Date,Amount To Pay,Reference No,Reference Date,Mode of Payment,Party Account,Cheque Reference No,Cheque Reference Date,Branch,CF Code\n';

    payment_entries.forEach(function(entry) {
        csv_data += [
            entry.party,
            entry.voucher_type,
            entry.posting_date,
            entry.amount_to_pay,
            entry.reference_no,
            entry.reference_date,
            entry.mode_of_payment,
            entry.party_account,
            entry.cheque_reference_no,
            entry.cheque_reference_date,
            entry.branch,
            entry.cf_code
        ].join(',') + '\n';
    });

    
    const blob = new Blob([csv_data], { type: 'text/csv' });


    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'bulk_payment_entries.csv';  
    link.click();
}
