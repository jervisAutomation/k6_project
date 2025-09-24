import http from 'k6/http';
import { check, sleep } from 'k6';
import { BASE_URL } from '../utils/config.js';

const createPayload = JSON.parse(open('../payloads/post/createPost.json'));

export const options = {
  vus: 5,
  duration: '10s',
};

export default function () {
  const url = `${BASE_URL}/posts`;
  const headers = { 'Content-Type': 'application/json' };
  const res = http.post(url, JSON.stringify(createPayload), { headers });

  check(res, {
    'status is 201': (r) => r.status === 201,
    'response has id': (r) => JSON.parse(r.body).id !== undefined,
  });

  sleep(1);
}