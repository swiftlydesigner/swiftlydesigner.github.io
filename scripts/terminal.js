function copyToClipboard(button, commandId) {
    
    // Get the element by its ID
    const commandElement = document.getElementById(commandId);
    
    // Get the text content of the element
    const commandText = commandElement.innerText; // or commandElement.textContent
    
    navigator.clipboard.writeText(commandText).then(() => {
        // Change button text to "Copied"
        button.innerText = 'Copied!';
        
        // Reset button text after 5 seconds
        setTimeout(() => {
            button.innerText = 'Copy';
        }, 5000);
       
    }).catch(err => {
        console.error('Failed to copy: ', err);
    });
}
