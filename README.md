# Installation

`npm install git+https://github.com/marvin007/sticky-sidebar.git#master`

# Use

```js
import StickySidebar from 'sticky-sidebar';
import 'sticky-sidebar/build/sticky-sidebar.min.css';

const stickySidebarInstance = new StickySidebar(/* selector or HTML element */);

stickySidebarInstance.update();
stickySidebarInstance.destroy();
```
