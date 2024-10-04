import { Form } from "react-router-dom";

export default function Home() {
  return (
    <div id="deck">
      <div>
        <Form method="post">
          <textarea name="deck" />
          <button type="submit">Create Deck</button>
        </Form>
      </div>
    </div>
  );
}
