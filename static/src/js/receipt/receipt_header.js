"use strict"
import { ReceiptHeader } from "@point_of_sale/app/screens/receipt_screen/receipt/receipt_header/receipt_header";
import { patch } from "@web/core/utils/patch";

patch(ReceiptHeader.prototype, {
    get Address(){
        console.log("data",this.props);
        const tmp_address=[];
        if(this.props.data.company.street){
            tmp_address.push(this.props.data.company.street);
        }
        if(this.props.data.company.city){
            tmp_address.push(this.props.data.company.city);
        }
        if(this.props.data.company.zip){
            tmp_address.push(this.props.data.company.zip);
        }
        if(this.props.data.company.phone){
            tmp_address.push("TEL:"+this.props.data.company.phone);
        }
        if(this.props.data.company.email){
            tmp_address.push(this.props.data.company.email);
        }
        if(this.props.data.company.website){
            tmp_address.push(this.props.data.company.website);
        }
        return tmp_address.join(',');
    }
});
