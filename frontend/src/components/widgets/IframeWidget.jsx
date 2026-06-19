import WidgetFrame from '../WidgetFrame';

export default function IframeWidget({ widget, onRemove }) {
  const { url, title } = widget.config || {};
  return (
    <WidgetFrame title={title || 'Embed'} eyebrow="iframe" led="blue" onRemove={onRemove} bodyPadding={false}>
      {url ? (
        <iframe src={url} title={title || url} className="iframe-widget__frame" />
      ) : (
        <p className="empty-note">No URL configured.</p>
      )}
    </WidgetFrame>
  );
}
