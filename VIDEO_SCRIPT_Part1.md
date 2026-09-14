# Smart-X Part 1: Video Script

**Target length:** about 9 to 10 minutes. **Don't run the app.** Keep the code on screen the whole time and scroll to each file as you talk about it.

> Tip: open the files in this order before you hit record, so you're just clicking from one tab to the next.
> `Program.cs` → `App.tsx` → `api.ts` → `SensorEndpoints.cs` → `SensorService.cs` → `TelemetryController.cs` → `TelemetryService.cs` → `TelemetryRepository.cs` → `TelemetryPacket.cs` → `SensorReading.cs` → `TelemetryHistory.cs` → `DeploymentNode.cs` → `DeploymentValidationService.cs`

---

## Intro (about 30 sec)

**On screen:** the folder tree in Visual Studio / VS Code.

> "Hi, I'm Matthew Jackson. This is Smart-X Part 1, the data ingestion gateway for an IoT sensor network.
> Picture a big farm or building with hundreds of small sensors. Each one keeps sending in readings like temperature or power usage. My project is the **gateway**. It's like a post office that receives all those readings, checks they're valid, stores them, and shows them on a dashboard.
> There are two halves. The **backend** is a .NET 10 Web API written in C#, and the **frontend** is a React dashboard. I'll go through how it starts up, how sensor data comes in, the OOP concepts I used, and how I handle data with arrays and recursion."

---

## 1. Gateway Startup Layout and API Integration (about 2.5 min)

### 1a. How the gateway starts up

**On screen:** `backend/Smart-X.Api/Program.cs`

> "Everything starts in `Program.cs`, in three stages.
>
> **Stage one: register the services.** Think of services as workers, each with one job. `SensorService` looks after sensors, `TelemetryService` processes readings, `ValidationService` checks input. I register them as **singletons**, which means there's only one copy of each worker and every request shares it. That matters because my data lives in memory. If each request got a new copy, the sensor list would be empty every time.
>
> I also set up **CORS**. Browsers block a web page from calling a server on a different address unless the server allows it. This policy lets the React dashboard on port 5173 talk to the API.
>
> **Stage two: build and seed.** Right after the app is built, `SeedDataService` registers four mock sensors and sends in some readings. The brief says this is a simulation, so seeding means the dashboard has data the moment it opens. The seed data goes through the same validation pipeline as real devices, so it's not just dropped straight into the lists.
>
> **Stage three: map the endpoints and run.** `/api/health` tells the dashboard the gateway is online. `MapSensorEndpoints` adds the minimal API routes, `MapControllers` adds the controller routes, and `app.Run()` starts listening."

**On screen:** `frontend/smartx-dashboard/src/App.tsx`, scroll to `PILLARS`

> "On the dashboard side, the startup menu shows the three pillars from the brief. Only **Sensor Data Ingestion** is enabled. **Command Stream** and **Network Topology** are disabled with a 'Coming soon' badge, because they're for Part 2 and the final PoE.
>
> When the dashboard loads, this `useEffect` runs once. It calls health, sensors and issues **at the same time** with `Promise.all`, then refreshes every 10 seconds."

### 1b. API integration

**On screen:** `src/services/api.ts`

> "All communication with the backend lives in this one file, `api.ts`. The API address isn't hard-coded. It comes from the `.env` file, so if the port changes I only update one line.
>
> Every function here is **asynchronous**. `fetch` sends the request, and `await` waits for the reply *without freezing the page*, so you can keep clicking while the server works.
>
> If the server sends back an error, like a 400 from validation, `response.ok` is false. I throw an error, and the dashboard shows it in a red banner."

**On screen:** `SensorEndpoints.cs`

> "On the backend, here's the matching endpoint. A POST to `/api/sensors` comes in as JSON, and ASP.NET turns it into a `SensorRegistrationRequest` object automatically. I **validate it again on the server**, because you should never trust what the client sends. If it's valid, it returns **201 Created**. If not, it returns **400 Bad Request** with a list of errors."

### 1c. The data structure and why it fits

**On screen:** `SensorService.cs`

> "Sensors are stored in a generic **`List<Sensor>`**. I chose a List for three reasons:
> 1. It **grows automatically**. I don't need to know upfront how many devices will register.
> 2. It **keeps things in order**, so the dashboard shows sensors in the order they were registered.
> 3. It's **type-safe**. The `<Sensor>` part means only Sensor objects can go in, so mistakes get caught when the code compiles.
>
> `GetAllSensors` returns a **copy** of the list, so other code can't accidentally change my stored data.
>
> One limitation is that finding a sensor means checking the list one item at a time. That's fine at this size. In Part 2 I'll switch to a **Dictionary** keyed by MAC address for instant lookups."

---

## 2. Sensor Telemetry (about 2 min)

### 2a. How sensor data is collected

**On screen:** `App.tsx`, scroll to `generateSimulatedReading`

> "We don't have physical ESP32 boards, so the dashboard includes a **simulator** that acts like one. Every 3 seconds it takes the last reading and nudges it up or down by a small random amount. That way the temperature drifts realistically instead of jumping from 20 to 90. It then POSTs the reading to the endpoint that matches the sensor's category. To the API, this looks exactly like a real device sending data."

**On screen:** `TelemetryController.cs`

> "This controller is the **front door** for sensor data. There's one endpoint per sensor type: `environmental`, `power` and `actuator`. All three reuse the **same generic packet class**, just with a different type inside. They all pass to one shared helper, `ProcessTelemetry<T>`, so the success and error handling is written once, not three times."

### 2b. The data ingestion process

**On screen:** `TelemetryService.cs`, `ProcessTelemetryAsync`

> "This is the **ingestion pipeline**. Every reading goes through six steps, like items on a factory conveyor belt:
> 1. **Is the packet complete?** It needs a device ID and data.
> 2. **Is the device registered?** Unknown devices are rejected.
> 3. **Is it the right type of data?** `IsTelemetryCompatible` checks, for example, that a power meter isn't sending temperature readings.
> 4. **Mark the sensor online.** Getting data proves the device is alive, so I set `IsOnline` and `LastSeen`.
> 5. **Store the full packet** in the repository.
> 6. **Extract just the numbers** and add them to the history array. I'll explain that array in the data handling section.
>
> If any check fails, an exception is thrown, and the controller turns it into a clear 400 error message."

**On screen:** `TelemetryRepository.cs`

> "Packets are stored in a **`List<ITelemetryPacket>`**. A packet of environmental data and a packet of power data are technically different types, so they share the `ITelemetryPacket` interface. That lets them all sit in **one** list. When the dashboard asks for one device's readings, a LINQ `Where` filters the list down to just that device."

---

## 3. Advanced Object-Oriented Programming (about 2 min)

### 3a. Generics

**On screen:** `Models/TelemetryPacket.cs`

> "This is my generic class, **`TelemetryPacket<T>`**. Think of it like a **shipping envelope**. Every envelope has the same labels: a packet ID, which device sent it, and a timestamp. The only thing that changes is what's inside. `T` is a placeholder for the contents.
>
> So `TelemetryPacket<EnvironmentalTelemetry>` carries temperature, humidity and pressure. `TelemetryPacket<PowerConsumptionTelemetry>` carries voltage and power. I wrote the envelope **once** and reuse it for every sensor type.
>
> Why not just make `Data` an `object`? Because then every time I read it I'd have to **cast** it back, and for simple values like numbers C# would have to **box and unbox** them. That's extra memory work, which matters on small gateway devices. With generics, `Data` stays as its real type, so there's no casting and no boxing.
>
> `TelemetryType` even works out its own label from `T`. `EnvironmentalTelemetry` becomes 'Environmental', which the dashboard uses to pick the right chart."

### 3b. Overloading

**On screen:** `Models/SensorReading.cs`

> "C# normally only knows how to use `+` on things like numbers and strings. If I have two smart meter readings and want the total, C# wouldn't know what `meter1 + meter2` means.
>
> **Overloading** means giving an existing name or symbol a new meaning for my own types. Here I overload the **`+` operator** for `SensorReading`. An operator overload is really just a special static method called `operator +`. It takes the reading on the left and the reading on the right, adds them field by field (temperature, humidity, power, energy), and returns a **new** reading. The originals don't change.
>
> Now I can write `var totalLoad = meter1 + meter2;`, which reads like normal maths."

**On screen:** `SensorAggregationService.cs`

> "The aggregation service shows it in use. `return first + second;` looks simple, but that plus sign is calling my overload. It's exposed through the `/api/SensorAggregation` endpoint."

> ⚠️ **See the note at the bottom of this script about method overloading.**

---

## 4. Data Handling (about 2 min)

### 4a. Arrays

**On screen:** `Services/TelemetryHistory.cs`

> "For raw historical data I use a **jagged array**, `double[][]`, which is an **array of arrays**. Picture a notebook where each line is one reading, and some lines are longer than others.
>
> - An environmental reading has **3** numbers.
> - A power reading has **4**.
> - An actuator reading has **1**.
>
> A normal grid array, `double[,]`, forces every row to be the same length, so short rows would waste space. A jagged array lets each row be exactly as long as it needs to be. That's why it's the right fit here.
>
> Arrays have a **fixed size**, so `AddReading` works in four steps: it creates a new array one slot bigger, copies the old rows across, puts the new reading in the last slot (`^1` means 'last'), and swaps the new array in.
>
> `GetHistory` returns a **deep copy**, so nobody can change the stored history from outside."

**On screen:** `TelemetryService.cs`, `ExtractTelemetryValues`

> "The rows come from here. This method flattens each packet into a plain `double[]` of numbers, which becomes one row in the jagged array."

### 4b. Recursion

**On screen:** `Models/DeploymentNode.cs`

> "Sensors are deployed in a hierarchy: **Facility A → Zone 1 → Sub-Zone B → Node**. Each `DeploymentNode` has a list of `Children`, and every child is *also* a `DeploymentNode`. It's like folders inside folders. That repeating shape is exactly what recursion is good at."

**On screen:** `Services/DeploymentValidationService.cs`

> "A **recursive** method is one that **calls itself**. Think of Russian nesting dolls. To check them all, you check one doll, open it, and do the *same check* on the doll inside, until you reach the smallest one.
>
> `ValidateTree` has two parts:
> - **Base cases** stop the recursion. If the node is null, or it's missing a name or type, return `false` straight away.
> - The **recursive case**. For each child, call `ValidateTree` again on that child. If any child, grandchild, or great-grandchild fails, the failure passes all the way back up and the whole tree is invalid.
>
> A node with **no children** skips the loop and returns `true`. That's what stops the recursion, so it can't loop forever. And because the method doesn't care how deep it is, the same few lines work for a 2-level tree or a 20-level tree."

**On screen:** `Utilities/DeploymentValidator.cs` (optional, 15 sec)

> "I also wrote a second version. Instead of stopping at the first problem, it walks the **whole** tree, collects **every** error in a list, and records the **depth** where each problem was found. That's more useful for an operator trying to fix a broken configuration."

---

## Outro (about 20 sec)

> "To sum up: the gateway starts by registering services and seeding data, and the React dashboard talks to it asynchronously. Sensor data goes through a six-step ingestion pipeline. `TelemetryPacket<T>` handles every sensor type without boxing, the overloaded `+` operator combines readings, a jagged array stores the raw history efficiently, and a recursive validator checks deployment trees of any depth. Thanks for watching."

---

## ⚠️ Note on "Method Overloading"

Your video brief says **Method Overloading**, but the rubric says **Operator Overloading**. Right now the code only has **operator** overloading (`operator +`). There are no two methods with the same name and different parameters.

The script above covers this honestly by saying an operator overload *is* a special static method. If you want a safe answer for either wording, add a real method overload (for example, two `Aggregate` methods in `SensorAggregationService`) and add this line to section 3b:

> "I also overloaded the `Aggregate` method. One version takes two readings, and another takes any number of readings. C# picks the right one based on what I pass in. It's the same method name with different parameters."
