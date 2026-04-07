import os
from html.parser import HTMLParser

class HTMLFilter(HTMLParser):
    def __init__(self):
        super().__init__()
        self.text = ""

    def handle_data(self, data):
        data = data.strip()
        if data:
            self.text += data + "\n"

files = [
    # Setup
    'Setup/System_Parameters.htm', 
    'Setup/Node_Management.htm', 
    'Setup/print_engine_configuration.htm', 
    'Setup/Flat_File_Value_Setup.htm', 
    'Setup/Price_Revision_Authorisation_Configuration.htm',
    'Setup/Goods_Inwards_Outwards_Prefix_Definition.htm',
    # Stock
    'Stock/PO-Con_Entry_Columns.htm',
    'Stock/GO_Configuration.htm',
    'Stock/PSM-Physical_Stock_Management.htm',
    'Stock/PO_Configuring_Purchase_Orders-Indents.htm',
    # Sales
    'Sales/Billing_Configuration.htm',
    'Sales/Mode_of_Payment_POS.htm',
    'Sales/Discounts_Priority_Configuration.htm',
    'Sales/Slips_Configuration_POS.htm',
    'Sales/Walk-in_Configuration.htm',
    # Cash
    'Cash/Till_Management_Config.htm',
    'Cash/Till_Cash_Limit_Configuration.htm',
    'Cash/Till_Node_Configuration.htm',
    # Reports
    'Reports/AR_Report_Display_Configuration.htm'
]

output = ""
for f in files:
    path = os.path.join('d:/IMP/GitHub/smriti-os/out_chm', f)
    if os.path.exists(path):
        with open(path, 'r', encoding='utf-8', errors='ignore') as file:
            content = file.read()
            parser = HTMLFilter()
            parser.feed(content)
            output += f"\n\n{'='*50}\nModule: {f}\n{'='*50}\n"
            output += parser.text
    else:
        output += f"\n\n{'='*50}\nModule: {f} (NOT FOUND)\n{'='*50}\n"

with open('C:/tmp/extracted_setup_modules.txt', 'w', encoding='utf-8') as f:
    f.write(output)

print("Extraction completed. Saved to C:/tmp/extracted_setup_modules.txt")
