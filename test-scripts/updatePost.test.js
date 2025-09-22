import http from 'k6/http';
import { check, sleep } from 'k6';
import { BASE_URL } from '../utils/config.js';

const createPayload = JSON.parse(open('../payloads/post/updatePost.json'));

export const options = {
  vus: 5,
  duration: '20s',
};

export default function () {
  const url = `${BASE_URL}/posts/1`;
  const headers = { 'Content-Type': 'application/json' };
  const res = http.put(url, JSON.stringify(createPayload), { headers });

  check(res, {
    'status is 200': (r) => r.status === 200,
    'check response time is less than 15 seconds': (r) => r.timings.duration < 15000
  });

  sleep(1);
}
