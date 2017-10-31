/**
 * Created by bangbang93 on 2017/10/22.
 */

'use strict';
import * as rp from 'request-promise'
import * as cheerio from 'cheerio'
import * as fs from 'fs-extra'
import * as path from 'path'
require('loud-rejection')()

const request = rp.defaults({
  headers: {
    cookie: fs.readFileSync('./cookie.txt','utf8').trim()
  }
});

const DOWNLOAD_DIR = path.resolve('download')


async function main(index){
  const indexHtml = await request(index)
  const $ = cheerio.load(indexHtml)
  let title = $('#gj').text()
  if (!title) {
    title = $('#gn').text()
  }
  const dir = path.join(DOWNLOAD_DIR, title)
  await fs.ensureDir(dir)

  console.log(title)

  const firstImg = $('#gdt').find('a').eq(0)

  let next = firstImg.attr('href')
  console.log(next)

  const totalHtml = $('#gdd').find('> table > tbody > tr:nth-child(6) > td.gdt2').text()
  const total = Number(totalHtml.match(/(\d+) pages/)[1])
  if (Number.isNaN(total)) {
    throw new Error('cannot get total')
  }

  for(let i = 1;i<=total;i++){
    console.log(`${i}/${total}`);
    const html = await request(next);
    const $ = cheerio.load(html);
    const img = $('#img');
    const src = img.attr('src');
    console.log(src);
    try {
      const body = await request(src, {encoding: null});
      await fs.writeFile(`${dir}/${i}.jpg`, body);
      next = $('#next').attr('href');
    } catch (e) {
      console.error(e)
      const loadfail = $('#loadfail')
      const onclick = loadfail.attr('onclick')
      const [,imgId] = onclick.match(/return nl\('(.*)'\)/)
      if (!imgId) {
        console.error('无法retry')
        return
      }
      next+=(next.indexOf("?")>-1?"&":"?")+"nl="+imgId;
    }
    console.log(next);
  }
}

main(process.argv[2])
