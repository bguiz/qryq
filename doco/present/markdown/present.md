# qryq

## stop RESTing, start using query queues

<sup>
  /ˈkwərik/
</sup>

### Brendan Graetz

![Brendan Graetz](https://si0.twimg.com/profile_images/2697395233/8dec79da8f5963a4cad4da0ebd6a532d.png "Brendan Graetz on Twitter")

[@bguiz](http://bguiz.com "Brendan Graetz on Twitter")

[bguiz.com](http://bguiz.com "Brendan Graetz")

----

## In one sentence

`qryq` is a NodeJs library that allows one to express a series of queries and define dependencies between them either in parallel, in sequence, or in a directed acyclic graph.

![Directed Acyclic Graph](http://upload.wikimedia.org/wikipedia/commons/thumb/3/39/Directed_acyclic_graph_3.svg/356px-Directed_acyclic_graph_3.svg.png)

---

<blockquote>
A directed graph with no directed cycles.<br />
That is, it is formed by a collection of vertices and directed edges, each edge connecting one vertex to another, such that there is no way to start at some vertex v and follow a sequence of edges that eventually loops back to v again
</blockquote>

-- [Directed acyclic graph](http://en.wikipedia.org/wiki/Directed_acyclic_graph)

----

## Implementation

- [node.js](http://nodejs.org)
- [Q](https://github.com/kriskowal/q)
- [underscore.js](http://underscorejs.org)
- [nodeunit](https://github.com/caolan/nodeunit)

----

## Inspiration

- Neil Jenkin's talk Tips, Tricks and Hacks in the Pursuit of Speed
  - [REST is slow](http://nmjenkins.com/presentations/network-speed.html#/14)
  - [Concatenate requests](http://nmjenkins.com/presentations/network-speed.html#/15)
  - [Concatenate responses](http://nmjenkins.com/presentations/network-speed.html#/16)

---

<pre>
  <code class="js">
POST /api/

[
    [ 'deleteMessages', {
        idList: [ 'msg1' ]
    }],
    [ 'getMailboxMessageList', {
        mailboxName: 'Inbox',
        position: 0,
        limit: 30,
        sort: 'date descending'
    }]
]
  </code>
</pre>

---

## Inspiration

- [Play framework](http://playframework.com)'s
  - [Linkedin talk by Yevgeniy Brikman](http://www.slideshare.net/brikis98/the-play-framework-at-linkedin)
  - See slides 85 through 88

---

<div>
  <iframe src="http://www.slideshare.net/slideshow/embed_code/22423382?rel=0&startSlide=85" width="512" height="421" frameborder="0" marginwidth="0" marginheight="0" scrolling="no" style="border:1px solid #CCC;border-width:1px 1px 0;margin-bottom:5px" allowfullscreen webkitallowfullscreen mozallowfullscreen>
  </iframe>
  <div style="margin-bottom:5px">
    <strong> <a href="http://www.slideshare.net/brikis98/the-play-framework-at-linkedin" title="The Play Framework at LinkedIn" target="_blank">The Play Framework at LinkedIn</a></strong> from <strong><a href="http://www.slideshare.net/brikis98" target="_blank">Yevgeniy Brikman</a></strong>
  </div>
</div>

----

## The Itch

- NodeJs callback spaghetti
- Fix this using promises
- While better, if the code is sufficiently complex, you can still end up with:
- Promise spaghetti

![Callback Spaghetti](image/callback-spaghetti.png)

----

### Light Bulb

[Question on S/O](http://stackoverflow.com/questions/17342401/q-executing-a-series-of-promises-and-defining-dependencies-between-them-in-a-d "Q - executing a series of promises and defining dependencies between them in a DAG")
![Stackoverflow Question](image/stackoverflow-qn.png)

----

## The Query Queue

<pre>
  <code>
[
  {id: "q1", api: "add", qry:{a:1, b:9}},
  {id: "q2", api: "add", qry:{a:99, b:1}},
  {id: "q3", api: "multiply", qry:{a: "#{q1}", b: "#{q2}"}},
  {id: "q4", api: "multiply", qry:{a: "#{q3}", b:5}}
]
  </code>
</pre>

<pre>
  <code>
`q2`                          --> add(99, 1)          --> 100
`q1`                          --> add(1, 9)           --> 10
`q3` --> multiply(`q1`, `q2`) --> multiply(10, 100)   --> 1000
`q4` --> multiply(`q3`, 5)    --> multiply(1000, 5)   --> 5000
  </code>
</pre>

- `q1` and `q2` may execute in any order,
- `q3` may only execute after *both* `q1` and `q2`,
- and `q4` executes last.
- Wiring is done automatically by `qryq`

---

### What about async?

- Dev productivity in accomplishing the same thing:
  - Sequential: ~Same
  - Parallel: ~Same
  - Dependent: A lot easier

----

### Code

Let's look at some!

- What is it like to write the same thing using async vs. using qryq?
- (also callbacks, and promises)

----

### Key comparisons

- assembly && execution
- declarative || imperative
- developer productivity
- what it is and what it isn't

----

## Benefits

- Developer productivity
- Bandwidth & latency savings

---

### Benefits - Dev Productivity

<blockquote>
This is the Unix philosophy: Write programs that do one thing and do it well. Write programs to work together.
</blockquote>

-- Doug McIlroy, invented pipes in UNIX

---

### Benefits - Dev Productivity

- Less need to write dedicated API endpoints
  - instead write small API endpoints, and chain them together
  - readable && composable
  - declarative query rather than imperative
  - avoid callback spaghetti && promise spaghetti

---

### Benefits - Dev Productivity


- Less duplication of biz logic required
  - Client/ server
- Groups several queries together as an atomic unit
  - [Asynchronous UIs](http://blog.alexmaccaw.com/asynchronous-ui)

---

### Benefits - 'Net Traffic

- Concatenation of
  - Multiple requests
  - Multiple responses
- [Protocol overhead](http://sd.wareonearth.com/~phil/net/overhead/) minimised

----

## Limitations

- non-RESTful
- Testability?
- Expression engine

---

### Limitations - REST

- Do you need REST when you are *not* doing CRUD?
- What if you typically chain more than one CRUD operation together?

---

### Limitations - Testing

- Harder because clients may compose API calls in novel ways
- Need to write more robust code

---

### Limitations - Expressions

<blockquote>
`#{previousQry}.flights.length`
</blockquote>

- A `qry` references results of another `qry` in the same `qryq`
- Limited: Can only "drill down" through properties

----

Avoiding

- Callback spaghetti
- Promise spaghetti

----

### Where to use: Client side

- Instead of making multiple XHR requests to each RESTful API endpoints
  - and assemble them together by hand
- Invoke qryq, and it will assemble the multiple requests together itself
  - still makes multiple XHR requests
- Great if goal is dev productivity,
  - and not so much bandwidth savings

----

### Where to use: Server side

- Instead of making multiple XHR requests to each RESTful API endpoints
  - and assemble them together by hand on the client
- Invoke qryq API endpoint, and it assembles and excutes the multiple requests
  - Single XHR request-response pair
- Dev productivity + Bandwidth savings
  - Only if your server is in JS <sup>&lowast;</sup>

----

## Horizon

- [x] Rewrite the `Q` spaghetti in [walkre](https://github.com/bguiz/walkre)
  - Demonstrate how declaratively defining dependent queries can make code more comprehensible
- [x] Feature to reference results of dependent queries *inline* in query data
  - Kinda [like this](http://nmjenkins.com/presentations/network-speed.html#/17)
- [x] Separate [qryq](https://github.com/bguiz/qryq) into its own library - out of [walkre](https://github.com/bguiz/walkre)
- [x] Unit tests - `nodeunit`
- [x] Pick a licence for this library - GPL v3
- [x] Infer `depends` if not provided using two passes when parsing each `qry`
- [x] Comparison with async, use diamond shaped query graph

---

### Farther Horizon

- [ ] Cyclic graph detection in dependent query queue validation
- [ ] Allow client to create promises and pass in to `qryq`
- [ ] Benchmarking for performance
- [ ] Load testing/ stress testing
  - Start including high latency ops, e.g. disk I/O
- [ ] Create a NodeJs/ ExpressJs server wrapper for `qryq`
  - For full stack load testing/ stress testing
- [ ] Minify

----

### Decisions

- Should the server return all reponses?
  - Perhaps allow specifyinf which queries we are interested in the return value of.
- Port to other languages?
  - Which ones?

----

## Fin

- Recommendations for load testing a NodeJs server?
- What other libraries are there out that that perform this function? In other languages?
- Submit some patches!

----

## Thank you

[bguiz.com](http://bguiz.com "my blog")

[@bguiz](http://twitter.com/bguiz "my twitter")

[github.com/bguiz/qryq](https://github.com/bguiz/qryq "qryq source")
