---
title: "S01E01"
categories: ["English","Mom"]
tags: ["Mom"]
program: "Mom"
author: "xiufen"
layout: "post"
---

我相信您会品尝到我们的

I think you'll find our...

那帕霞多丽葡萄酒有淡淡的香草和焦糖味

Napa Chardonnay to have hints of vanilla and caramel

入口十分爽滑

with a velvety smooth finish.

你还好吗

Are you all right?

有时欢喜有时忧

Some days are better than others.

您有心了

Thanks for asking.



## relative path in nodejs
  if we open a terminao at */code/* and we run:
  ``` bash
  node test/server.js
  ```

## dotenv Module can load environment variables from the .env file into *process.env*

## debug VS console.log

  Debug module can decide whether to print data or not based on the running environment, thus avoiding any logging during production phase.

  ```
  var debug = require('debug')('dev')

   axios.get('/user', {
      params: {
        ID: 12345
      }
    })
    .then(function (response) {
      debug(response);
      // do something with response data
    })
    .catch(function (error) {
      debug(error);
      // do something with error
    });
  ```

## About The DOM Event

  Almost every dom element has a onclick event btw.

  ```html test.html

  <button id="my-button" type="button">click at me</button>

  ```

  ```js test.html

  document.getElementById("my-button").onclick = doSomething;
  function doSomething(e){
    console.log(e); // e = event and this = button
  }

  ```

  ```html test.html

  <button id="my-button" type="button" onclick="doSomething(event)">click at me</button>

  ```

  ```js test.html

  function doSomething(e){
    console.log(e); // e = event and this = window
  }

  ```

  ```html test.html

  <button id="my-button" type="button" onclick="doSomething.call(this,event)">click at me</button>

  ```

  ```js test.html

  function doSomething(e){
    console.log(e); // e = event and this = element
  }

  ```
