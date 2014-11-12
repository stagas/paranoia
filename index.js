
/**
 * @title paranoia
 * @artist stagas
 */

import snare from 'jd-code/groovit/master/SAMPLES/SNAR_13D.WAV';
import hihat from 'pdv/webmpc/master/sounds/r909/909hat.wav';
import guitar from 'zillionk/AirInstruments/master/data/guitarAm.wav';

import Delay from 'opendsp/delay';
import Allpass from 'opendsp/allpass';
import Reverb from 'opendsp/freeverb';
import Sampler from 'stagas/sampler';
import Diode from 'opendsp/diodefilter';
import prewarp from 'opendsp/prewarp';
import envelope from 'opendsp/envelope';
import { Sin, Saw, Tri } from 'opendsp/wavetable-osc';
import { sin } from 'opendsp/osc';

var lpf = Diode();

var drums = Sampler(8);

drums.tune(1.1);
drums.add('snare', snare);
drums.add('hihat', hihat);

var lead = Sampler(1);
lead.add('guitar', guitar);

var delay = Delay();
var reverb = Reverb().room(0.92).damp(0.65);
var osc = Tri(6, false);

var out_exp = Allpass(35);
var bass_exp = Allpass(75);

var bass_osc = Saw();

export function dsp(t) {
  t *= 1.2;

  if ( (t*8)    % 1 === 0 ) lead.tune([0.1,[.2,2][t/4%2|0]][t%2|0]);

  var vibrato = sin(t, 1/6);
  var out = osc(400 + vibrato * 350) * envelope(t, 1/8, 80, 1) * .2;
  var kick = Math.sin(65 * envelope(t, 1/4, 28, 1.5));

  if ( (t/2+2/4) % 1 === 0 ) drums.play('snare', 1, 1);
  if ( (t+2/4)   % 1 === 0 ) drums.play('hihat', 0.8, 1.2);

  if ( (t+1/8*2) % 1 === 0 ) lead.play('guitar', 0.8, 4.5);
  if ( (t/8+2/4) % 1 === 0 ) lead.play('guitar', 0.8, [7,14][(t/8)%2|0]);
  if ( (t/2+3/4) % 1 === 0 ) lead.play('guitar', 0.75, 4.5);

  out += lead.mix() * 1.5 * envelope(t + 3/4, 1/8, 20, [1,50][t%2|0]);

  out = delay
    .feedback(.8)
    .delay(300 + (sin(t, .5) * 50) + (10 * sin(t, 8)))
    .run(out);
  
  out = reverb.run(out * 0.7) * 0.5
      + out * 0.5;

  var bass_out = bass_osc([440,75,1380,150][t%4|0]/[1,2.3][t*4%2|0]) * envelope(t, 1/16, 30, 1);
  var fc = prewarp(180 + (1200 + sin(t, .06) * 600 + sin(t, 1) * 150 + sin(t, 4) * 100) * envelope(t, 1/16, 6, 1.2));
  var G = fc / (1 + fc);

  bass_out = lpf.cut(G).res(0.3).hpf(0.6).run(bass_out * .5);

  var left = 0.8 * (
    drums.mix() * 0.3
  + kick * 1.3
  );

  var right = left;
  
  var bass_gain = 0.5;
  left += bass_out * bass_gain;
  right += bass_exp.run(bass_out * bass_gain);

  var out_gain = 0.35;
  left += out * out_gain;
  right += out_exp.run(out * out_gain);

  return [left * .8, right * .8];
}
