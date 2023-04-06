import { createServer } from "http";
import { createReadStream } from "fs";
import { Readable, Transform } from "node:stream";
import { WritableStream, TransformStream } from "node:stream/web";
import { setTimeout } from "node:timers/promises";
import csvtojson from "csvtojson";

const PORT = 3001;

createServer(async (req, res) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "*"
  };

  if (req.method === "OPTIONS") {
    res.writeHead(204, headers);
    res.end;
    return;
  }

  let items = 0;
  req.once('close', _=> console.log(`Connection closed! ${items} items was sent.`))

  //streams sempre são lidas linha a linha pq ao final do seu uso, a mesma já é descartada para economizar memória
  //pipe transforma algo readable para writable

  //convertendo readable stream para web ==> Readable.toWeb(createReadStream("path do arquivo"))
  Readable.toWeb(createReadStream("./animeflv.csv"))
    //pipethrough é o passo a passo que cada item individual vai trafegar
    //.pipeThrough(Transform.toWeb(csvtojson())) ==> vai converter o csv para json (cada item será convertido de csv para json)
    .pipeThrough(Transform.toWeb(csvtojson()))
    .pipeThrough(
      new TransformStream({
        transform(chunk, controller) {
          //cada chunk é uma linha do arquivo csv
          const { title, description, url_anime } = JSON.parse(
            Buffer.from(chunk)
          );
          // console.log("chunk >>>", Buffer.from(chunk).toString());

          //extraindo somente os dados necessários
          controller.enqueue(
            JSON.stringify({
              title,
              description,
              url_anime
            }).concat("\n")
          );

          //.concat("\n") ==> concat neste caso está servindo para quebrar a linha do JSON (formato original: NDJSON)
        }
      })
    )
    //pipeto é a última etapa
    .pipeTo(
      new WritableStream({
        async write(chunk) {
          //mandando dados sob demanda, a cada 1 segundo
          await setTimeout(1000);

          items++;
          res.write(chunk);
        },
        close() {
          res.end();
        }
      })
    );

  res.writeHead(200, headers);
})
  .listen(PORT)
  .on("listening", _ => console.log(`server running on ${PORT}`));
